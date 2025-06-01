import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, FlatList, ActivityIndicator, Alert, Platform, TouchableOpacity, UIManager, LayoutAnimation
} from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router'; // Added Link for potential back navigation
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';
import theme from '../../../src/styles/theme'; // Path from app/contact/
import {
  getContactById, updateContact, getAllCategories, getCategoryById,
  getEventsForContact, addEventForContact, getNewsForContact, addNewsForContact,
  initializeSchema, Contact, Category, ContactEvent, ContactNews, UpdatableContact
} from '../../../src/database/database';
import { scheduleBirthdayNotification } from '../../../src/services/NotificationService';
import * as Notifications from 'expo-notifications';

// Themed Button Component
const ThemedButton = ({ title, onPress, disabled, style, textStyle, type = 'primary' }: any) => {
  let buttonStyle = styles.primaryButton;
  if (type === 'secondary') buttonStyle = styles.secondaryButton;
  if (type === 'destructive') buttonStyle = styles.destructiveButton;

  return (
    <TouchableOpacity
      style={[styles.buttonBase, buttonStyle, disabled && styles.disabledButton, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonTextBase, disabled && styles.disabledButtonText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};


const ContactDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  // const router = useRouter(); // Use Link for back navigation if needed, or router.back()

  const [contactDetails, setContactDetails] = useState<Contact | null>(null);
  const [currentCategoryName, setCurrentCategoryName] = useState<string | null>(null);

  const [editableBirthday, setEditableBirthday] = useState<string>('');
  const [editableFoodPrefs, setEditableFoodPrefs] = useState<string>('');
  const [editableNotes, setEditableNotes] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);

  const [categories, setCategories] = useState<Category[]>([]);

  const [events, setEvents] = useState<ContactEvent[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');

  const [newsItems, setNewsItems] = useState<ContactNews[]>([]);
  const [newNewsItem, setNewNewsItem] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactId = parseInt(id, 10);

  const loadContactData = useCallback(async () => {
    if (isNaN(contactId)) {
      setError("Invalid Contact ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await initializeSchema();
      const fetchedContact = await getContactById(contactId);
      setContactDetails(fetchedContact);

      if (fetchedContact) {
        setEditableBirthday(fetchedContact.birthday || '');
        setEditableFoodPrefs(fetchedContact.food_preferences || '');
        setEditableNotes(fetchedContact.notes || '');
        setSelectedCategoryId(fetchedContact.category_id || undefined);

        if (fetchedContact.category_id) {
          const category = await getCategoryById(fetchedContact.category_id);
          setCurrentCategoryName(category?.name || 'Unknown');
        } else {
          setCurrentCategoryName('N/A');
        }

        setEvents(await getEventsForContact(contactId));
        setNewsItems(await getNewsForContact(contactId));
      } else {
        setError("Contact not found.");
      }
      setCategories(await getAllCategories());
    } catch (e: any) {
      console.error("Error loading contact data:", e);
      setError(e.message || "Failed to load contact data.");
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadContactData();
  }, [loadContactData]);

  // Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  const handleSaveChanges = async () => {
    if (!contactDetails) return;
    setIsSaving(true);
    const prevBirthday = contactDetails.birthday;
    const updatedData: UpdatableContact = {
      birthday: editableBirthday.trim() || null,
      food_preferences: editableFoodPrefs.trim() || null,
      notes: editableNotes.trim() || null,
      category_id: selectedCategoryId,
    };

    try {
      await updateContact(contactDetails.id, updatedData);
      Alert.alert("Success", "Contact updated successfully.");

      if (updatedData.birthday !== prevBirthday) {
        if (updatedData.birthday && contactDetails.first_name) {
          const contactForNotification: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'birthday'> = {
            id: contactDetails.id,
            first_name: contactDetails.first_name,
            last_name: contactDetails.last_name,
            birthday: updatedData.birthday,
          };
          await scheduleBirthdayNotification(contactForNotification);
        } else if (!updatedData.birthday) {
          await Notifications.cancelScheduledNotificationAsync('birthday-' + contactDetails.id);
        }
      }
      await loadContactData();
    } catch (e: any) {
      console.error("Error saving changes:", e);
      Alert.alert("Error", e.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEvent = async () => { /* ... (implementation as before, but use ThemedButton) ... */
    if (!contactDetails || !newEventName.trim()) {
      Alert.alert("Validation", "Event name is required.");
      return;
    }
    setIsSaving(true); // Use common saving flag for simplicity
    try {
      await addEventForContact(contactDetails.id, {
        event_name: newEventName.trim(),
        event_date: newEventDate.trim() || undefined,
        description: newEventDescription.trim() || undefined,
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNewEventName('');
      setNewEventDate('');
      setNewEventDescription('');
      setEvents(await getEventsForContact(contactId));
      Alert.alert("Success", "Event added.");
    } catch (e: any) { console.error("Error adding event:", e); Alert.alert("Error", "Failed to add event."); }
    finally { setIsSaving(false); }
  };

  const handleAddNewsItem = async () => { /* ... (implementation as before, but use ThemedButton) ... */
    if (!contactDetails || !newNewsItem.trim()) {
      Alert.alert("Validation", "News item cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      await addNewsForContact(contactDetails.id, { news_item: newNewsItem.trim() });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNewNewsItem('');
      setNewsItems(await getNewsForContact(contactId));
      Alert.alert("Success", "News item added.");
    } catch (e: any) { console.error("Error adding news item:", e); Alert.alert("Error", "Failed to add news item."); }
    finally { setIsSaving(false); }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={styles.loadingText}>Loading...</Text></View>;
  }
  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }
  if (!contactDetails) {
    return <View style={styles.centered}><Text style={styles.emptyText}>Contact not found.</Text></View>;
  }

  // Screen content with theming
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* TODO: Potential for advanced animation: Shared element transition for avatar from ContactsListScreen */}
      {/* Would require a library like 'react-navigation-shared-element' or custom Reanimated setup. */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarPlaceholder}>
          <FontAwesome name="user-circle" size={80} color={theme.colors.secondary} />
        </View>
        <Text style={styles.headerText}>{contactDetails.first_name} {contactDetails.last_name}</Text>
      </View>

      {/* TODO: Potential for advanced animation: Collapsible sections using Reanimated/Moti */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone:</Text><Text style={styles.infoValue}>{contactDetails.phone_number || 'N/A'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{contactDetails.email || 'N/A'}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <Text style={styles.infoValue}>Current: {currentCategoryName}</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategoryId}
            onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem} // For iOS picker item styling
          >
            <Picker.Item label="-- Select Category --" value={undefined} style={styles.pickerItemDefault} />
            {categories.map(cat => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.label}>Birthday (YYYY-MM-DD):</Text>
        <TextInput style={styles.input} value={editableBirthday} onChangeText={setEditableBirthday} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.placeholderText}/>
        <Text style={styles.label}>Food Preferences:</Text>
        <TextInput style={styles.input} value={editableFoodPrefs} onChangeText={setEditableFoodPrefs} placeholder="Any allergies or preferences?" placeholderTextColor={theme.colors.placeholderText}/>
        <Text style={styles.label}>Notes:</Text>
        <TextInput style={[styles.input, styles.multilineInput]} value={editableNotes} onChangeText={setEditableNotes} multiline placeholder="General notes..." placeholderTextColor={theme.colors.placeholderText}/>
        <ThemedButton title={isSaving ? "Saving..." : "Save Changes"} onPress={handleSaveChanges} disabled={isSaving}/>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Events</Text>
        <FlatList
          data={events}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemTitle}>{item.event_name}</Text>
              <Text style={styles.itemSubText}>{item.event_date || 'No date'}{item.description ? ` - ${item.description}` : ''}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyListText}>No events recorded.</Text>}
        />
        <TextInput style={styles.input} placeholder="Event Name" value={newEventName} onChangeText={setNewEventName} placeholderTextColor={theme.colors.placeholderText}/>
        <TextInput style={styles.input} placeholder="Event Date (YYYY-MM-DD)" value={newEventDate} onChangeText={setNewEventDate} placeholderTextColor={theme.colors.placeholderText}/>
        <TextInput style={[styles.input, styles.multilineInput]} placeholder="Description" value={newEventDescription} onChangeText={setNewEventDescription} multiline placeholderTextColor={theme.colors.placeholderText}/>
        <ThemedButton title={isSaving ? "Adding..." : "Add Event"} onPress={handleAddEvent} disabled={isSaving} type="secondary"/>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>News & Updates</Text>
        <FlatList
          data={newsItems}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemTitle}>{item.news_item}</Text>
              <Text style={styles.itemDate}>Recorded: {new Date(item.date_recorded).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyListText}>No news items recorded.</Text>}
        />
        <TextInput style={[styles.input, styles.multilineInput]} placeholder="New news item..." value={newNewsItem} onChangeText={setNewNewsItem} multiline placeholderTextColor={theme.colors.placeholderText}/>
        <ThemedButton title={isSaving ? "Adding..." : "Add News"} onPress={handleAddNewsItem} disabled={isSaving} type="secondary"/>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.medium,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.large,
  },
  loadingText: {
    marginTop: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  errorText: {
    color: theme.colors.destructiveButtonBackground,
    fontSize: theme.fontSizes.medium,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.lightText,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.large,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.avatarPlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  headerText: {
    fontSize: theme.fontSizes.title,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.large,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.medium,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.small,
  },
  infoLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.lightText,
    fontWeight: 'bold',
    width: 80, // Or adjust as needed
  },
  infoValue: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    flex: 1,
  },
  label: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    marginTop: theme.spacing.small,
  },
  input: {
    backgroundColor: theme.colors.background, // Slightly different from card for contrast
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    paddingVertical: Platform.OS === 'android' ? theme.spacing.small : theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    borderRadius: theme.borderRadius.small,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    borderRadius: theme.borderRadius.small,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.medium,
  },
  picker: {
    width: '100%',
    // Height is tricky for Picker, Platform specific styling might be needed if default is not good
    height: Platform.OS === 'android' ? 50 : undefined, // Android needs explicit height
    color: theme.colors.text,
  },
  pickerItem: { // For iOS
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  pickerItemDefault: { // For iOS placeholder
    color: theme.colors.placeholderText,
  },
  listItem: {
    backgroundColor: theme.colors.background, // Slightly different from section for depth
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  itemSubText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.lightText,
  },
  itemDate: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.lightText,
    marginTop: theme.spacing.xsmall,
  },
  emptyListText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.lightText,
    textAlign: 'center',
    padding: theme.spacing.medium,
  },
  // Themed Button Styles
  buttonBase: {
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.small, // Add some top margin for buttons
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryButtonBackground,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondaryButtonBackground,
  },
  destructiveButton: {
    backgroundColor: theme.colors.destructiveButtonBackground,
  },
  buttonTextBase: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.buttonText, // Default to white for primary/destructive
  },
  disabledButton: {
    backgroundColor: theme.colors.disabledButtonBackground,
  },
  disabledButtonText: {
    color: theme.colors.disabledButtonText,
  },
});

export default ContactDetailScreen;
