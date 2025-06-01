import * as Contacts from 'expo-contacts';
import {
  addContact,
  getCategoryByName,
  getContactByNativeId,
  initializeSchema, // Import initializeSchema to ensure DB is ready
  Category,
  NewContact,
  orumaDb // direct db access if needed for more complex checks, though not used here yet
} from '../database/database';

export const requestContactsPermission = async (): Promise<boolean> => {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === Contacts.PermissionStatus.GRANTED;
};

export const fetchDeviceContacts = async (permissionGranted: boolean): Promise<Contacts.Contact[]> => {
  if (!permissionGranted) {
    console.log('Contacts permission not granted. Cannot fetch contacts.');
    return [];
  }
  try {
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.Birthday,
        // Contacts.Fields.ID // native_id is deviceContact.id by default
      ],
    });
    return data;
  } catch (error) {
    console.error("Error fetching device contacts:", error);
    return [];
  }
};

const formatBirthday = (birthday: Contacts.Birthday): string | undefined => {
  if (birthday && birthday.year && birthday.month && birthday.day) {
    // Month is 0-indexed in JavaScript Date, but expo-contacts provides month 1-12.
    // SQLite expects YYYY-MM-DD
    const year = birthday.year;
    const month = birthday.month.toString().padStart(2, '0');
    const day = birthday.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return undefined;
};

export const syncContactsToDB = async (): Promise<void> => {
  // Ensure database is initialized
  try {
    await initializeSchema(); // Make sure tables and default categories exist
  } catch (dbError) {
    console.error("Failed to initialize database for contact sync:", dbError);
    return; // Exit if DB initialization fails
  }

  const permissionGranted = await requestContactsPermission();
  if (!permissionGranted) {
    console.log('Contacts permission denied. Sync process aborted.');
    return;
  }

  console.log('Fetching device contacts...');
  const deviceContacts = await fetchDeviceContacts(permissionGranted);
  if (deviceContacts.length === 0) {
    console.log('No device contacts found or fetched.');
    return;
  }

  console.log(`Fetched ${deviceContacts.length} device contacts. Starting sync...`);

  let defaultCategory: Category | null = null;
  try {
    defaultCategory = await getCategoryByName("Buddies / Casual Connections");
    if (!defaultCategory) {
      // This case should ideally be handled by initializeSchema ensuring default categories
      // or by creating it here if necessary. For now, we'll log and proceed without a default.
      console.warn("Default category 'Buddies / Casual Connections' not found. New contacts will not have a default category.");
    }
  } catch (catError) {
    console.error("Error fetching default category:", catError);
    // Proceeding without a default category in case of error
  }

  let newContactsCount = 0;
  for (const deviceContact of deviceContacts) {
    if (!deviceContact.id) {
      console.warn("Skipping device contact without an ID:", deviceContact);
      continue; // native_id is crucial
    }

    try {
      const existingContact = await getContactByNativeId(deviceContact.id);
      if (existingContact) {
        // console.log(`Contact with native_id ${deviceContact.id} (${deviceContact.firstName}) already exists. Skipping.`);
        // TODO: Implement update logic if needed in the future
        continue;
      }

      const newContact: NewContact = {
        native_id: deviceContact.id,
        first_name: deviceContact.firstName || null,
        last_name: deviceContact.lastName || null,
        phone_number: deviceContact.phoneNumbers?.[0]?.number || null,
        email: deviceContact.emails?.[0]?.email || null,
        category_id: defaultCategory?.id || null, // Assign default category if found
        birthday: deviceContact.birthday ? formatBirthday(deviceContact.birthday) : undefined,
        food_preferences: null, // No food preferences from device contacts
        notes: null, // No notes from device contacts
      };

      const result = await addContact(newContact);
      if (result && result.lastInsertRowId) {
        newContactsCount++;
        // console.log(`Added new contact: ${newContact.first_name} ${newContact.last_name}`);
      } else {
        console.warn(`Failed to add contact with native_id ${newContact.native_id}.`);
      }
    } catch (error) {
      console.error(`Error processing device contact ${deviceContact.id}:`, error);
    }
  }

  console.log(`Sync complete. Added ${newContactsCount} new contacts to the local database.`);
};
