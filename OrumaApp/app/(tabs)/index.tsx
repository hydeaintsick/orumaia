import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getAllContacts, Contact, initializeSchema } from '../../src/database/database'; // Path from app/(tabs)/
import { syncContactsToDB, requestContactsPermission } from '../../src/services/ContactSyncService'; // Path from app/(tabs)/
import { useRouter } from 'expo-router';
import theme from '../../src/styles/theme'; // Path from app/(tabs)/
import { FontAwesome } from '@expo/vector-icons'; // For placeholder icon

// Custom Button Component using theme
const ThemedButton = ({ title, onPress, disabled, style, textStyle }: any) => (
  <TouchableOpacity
    style={[styles.buttonBase, disabled ? styles.disabledButton : styles.primaryButton, style]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.buttonTextBase, disabled ? styles.disabledButtonText : styles.primaryButtonText, textStyle]}>
      {title}
    </Text>
  </TouchableOpacity>
);


const ContactsListScreen = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    if(!loading) setLoading(true); // Ensure loading is true when called directly
    try {
      await initializeSchema();
      const fetchedContacts = await getAllContacts();
      setContacts(fetchedContacts);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data from the database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    try {
      const permissionGranted = await requestContactsPermission();
      if (permissionGranted) {
        await syncContactsToDB();
        await loadData();
        Alert.alert("Sync Complete", "Contacts have been synced.");
      } else {
        Alert.alert("Permission Denied", "Cannot sync contacts without permission.");
      }
    } catch (error) {
      console.error("Error syncing contacts:", error);
      Alert.alert("Sync Error", "An error occurred while syncing contacts.");
    } finally {
      setIsSyncing(false);
    }
  };

  const renderItem = ({ item }: { item: Contact }) => (
    // TODO: Potential for advanced animation: Animate list item entrance/exit using Reanimated or Moti
    // For example, on add/delete, items could fade in/out or slide.
    // This would require managing item-specific animation states or using a library like `react-native-reanimated-flatlist`.
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => router.push(`/contact/${item.id}`)}
    >
      {/* TODO: Potential for advanced animation: Shared element transition for avatar to ContactDetailScreen */}
      <View style={styles.avatarPlaceholder}>
        <FontAwesome name="user" size={theme.fontSizes.large} color={theme.colors.secondary} />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemText}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.itemSubText}>{item.phone_number || item.email || 'No contact info'}</Text>
      </View>
      <FontAwesome name="chevron-right" size={theme.fontSizes.medium} color={theme.colors.lightText} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.syncButtonContainer}>
        <ThemedButton
            title={isSyncing ? "Syncing..." : "Sync Device Contacts"}
            onPress={handleSyncContacts}
            disabled={isSyncing || loading}
        />
      </View>
      {contacts.length === 0 && !isSyncing ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No contacts found. Try syncing with your device.</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
        />
      )}
      {isSyncing && <ActivityIndicator style={styles.syncingIndicator} color={theme.colors.primary}/>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Applied from theme
  },
  syncButtonContainer: {
    padding: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large,
  },
  loadingText: {
    marginTop: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing.medium,
    marginHorizontal: theme.spacing.medium,
    marginVertical: theme.spacing.small,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.borderColor,
    // Basic shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.10,
    shadowRadius: 1.41,
    // Basic shadow for Android
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.avatarPlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.medium,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: theme.fontSizes.medium, // Applied from theme
    fontWeight: 'bold',
    color: theme.colors.text, // Applied from theme
  },
  itemSubText: {
    fontSize: theme.fontSizes.small, // Applied from theme
    color: theme.colors.lightText, // Applied from theme
  },
  emptyText: {
    textAlign: 'center',
    marginTop: theme.spacing.large,
    fontSize: theme.fontSizes.medium, // Applied from theme
    color: theme.colors.lightText, // Applied from theme
  },
  listContentContainer: {
    paddingBottom: theme.spacing.large,
  },
  syncingIndicator: {
    marginTop: theme.spacing.medium, // Position it below the button or list
  },
  // Themed Button Styles
  buttonBase: {
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryButtonBackground,
  },
  buttonTextBase: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: theme.colors.buttonText,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabledButtonBackground,
  },
  disabledButtonText: {
    color: theme.colors.disabledButtonText,
  },
});

export default ContactsListScreen;
