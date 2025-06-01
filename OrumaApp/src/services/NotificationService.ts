import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Contact, getAllContacts, initializeSchema } from '../../src/database/database'; // Adjusted path for ../../src

// Set up the notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Changed to true for testing, can be false
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        // Android permissions are typically granted by default unless disabled by user
      });
      finalStatus = status;
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      console.warn('Notification permissions not granted!', finalStatus);
      return false;
    }

    // For Android, ensure the notification channel is set up (optional but good practice)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    console.log('Notification permissions granted.');
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Function to schedule a birthday notification for a single contact
export async function scheduleBirthdayNotification(
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'birthday'>
): Promise<void> {
  if (!contact.birthday) {
    // console.log(`Contact ${contact.first_name} ${contact.last_name} has no birthday set. Skipping notification.`);
    return;
  }

  const birthdayParts = contact.birthday.split('-'); // Expects YYYY-MM-DD
  if (birthdayParts.length !== 3) {
    console.warn(`Invalid birthday format for ${contact.first_name} ${contact.last_name}: ${contact.birthday}. Skipping.`);
    return;
  }

  // const year = parseInt(birthdayParts[0], 10); // Year is not used for repeating notifications by month/day
  const month = parseInt(birthdayParts[1], 10);
  const day = parseInt(birthdayParts[2], 10);

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn(`Invalid month or day for ${contact.first_name} ${contact.last_name}: ${contact.birthday}. Skipping.`);
    return;
  }

  const notificationId = `birthday-${contact.id}`;

  try {
    // Cancel any existing notification for this contact to avoid duplicates if birthday changes
    await Notifications.cancelScheduledNotificationAsync(notificationId);

    // Schedule new notification
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'Birthday Reminder!',
        body: `It's ${contact.first_name || ''} ${contact.last_name || ''}'s birthday today! Don't forget to send your wishes.`,
        data: { contactId: contact.id }, // Optional data to pass with notification
      },
      trigger: {
        month: month, // 1-12
        day: day,     // 1-31
        hour: 9,      // 9 AM
        minute: 0,
        repeats: true, // Repeat annually
      },
    });
    // console.log(`Scheduled birthday notification for ${contact.first_name} ${contact.last_name} on ${month}/${day}.`);
  } catch (error) {
    console.error(`Failed to schedule birthday notification for ${contact.first_name} ${contact.last_name}:`, error);
  }
}

// Function to schedule birthday notifications for all contacts
export async function scheduleAllBirthdayNotifications(): Promise<void> {
  console.log('Attempting to schedule all birthday notifications...');
  const permissionGranted = await requestNotificationPermissions();
  if (!permissionGranted) {
    console.log('Permission not granted for notifications. Cannot schedule birthday reminders.');
    return;
  }

  try {
    await initializeSchema(); // Ensure DB is ready
    const allContacts = await getAllContacts();
    if (allContacts.length === 0) {
      console.log('No contacts found in the database to schedule notifications for.');
      return;
    }

    let scheduledCount = 0;
    for (const contact of allContacts) {
      if (contact.birthday) {
        // Use the more specific Pick type for scheduleBirthdayNotification
        const contactSummary: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'birthday'> = {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          birthday: contact.birthday,
        };
        await scheduleBirthdayNotification(contactSummary);
        scheduledCount++;
      }
    }
    console.log(`Attempted to schedule ${scheduledCount} birthday notifications out of ${allContacts.length} contacts.`);
    // Alert.alert("Scheduling Complete", `Attempted to schedule ${scheduledCount} birthday notifications.`);
  } catch (error) {
    console.error('Error scheduling all birthday notifications:', error);
    // Alert.alert("Error", "Could not schedule all birthday notifications.");
  }
}
