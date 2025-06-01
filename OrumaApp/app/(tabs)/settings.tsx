import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Platform, UIManager, LayoutAnimation } from 'react-native';
import { addCategory, getAllCategories, Category, initializeSchema } from '../../src/database/database'; // Path from app/(tabs)/
import { scheduleAllBirthdayNotifications, requestNotificationPermissions } from '../../src/services/NotificationService'; // Path from app/(tabs)/
import theme from '../../src/styles/theme'; // Path from app/(tabs)/

// Custom Themed Button specific for this screen or could be global
const ThemedButton = ({ title, onPress, disabled, type = 'primary' }: any) => {
  let buttonStyle = styles.primaryButton;
  if (type === 'secondary') buttonStyle = styles.secondaryButton;

  return (
    <TouchableOpacity
      style={[styles.buttonBase, buttonStyle, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonTextBase, disabled && styles.disabledButtonText]}>{title}</Text>
    </TouchableOpacity>
  );
};

const SettingsScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [schedulingNotifications, setSchedulingNotifications] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      await initializeSchema();
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
      Alert.alert("Error", "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === '') {
      Alert.alert("Validation", "Category name cannot be empty.");
      return;
    }
    setAdding(true);
    try {
      const result = await addCategory(newCategoryName.trim());
      if (result && result.lastInsertRowId) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNewCategoryName('');
        // loadCategories will refetch and update state, triggering animation if FlatList data changes
        await loadCategories();
        Alert.alert("Success", "Category added successfully.");
      } else {
        Alert.alert("Error", "Failed to add category. It might already exist or another error occurred.");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setAdding(false);
    }
  };

  const handleScheduleAllNotifications = async () => {
    setSchedulingNotifications(true);
    try {
      const permissionGranted = await requestNotificationPermissions();
      if (permissionGranted) {
        await scheduleAllBirthdayNotifications();
        Alert.alert("Notification Scheduling", "Attempted to schedule all birthday notifications. Check console for details.");
      } else {
        Alert.alert("Permission Denied", "Cannot schedule notifications without permission.");
      }
    } catch (error) {
      console.error("Error scheduling all notifications from settings:", error);
      Alert.alert("Error", "An error occurred while scheduling notifications.");
    } finally {
      setSchedulingNotifications(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItemContainer}>
      <Text style={styles.categoryItemText}>{item.name}</Text>
    </View>
  );

  if (loading && categories.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage Categories</Text>
        <View style={styles.addCategoryContainer}>
          <TextInput
            style={styles.input}
            placeholder="New category name"
            placeholderTextColor={theme.colors.placeholderText}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <ThemedButton title={adding ? "Adding..." : "Add"} onPress={handleAddCategory} disabled={adding} />
        </View>

        <Text style={styles.listHeader}>Existing Categories</Text>
        {categories.length === 0 && !loading ? (
           <View style={styles.centeredMessage}>
              <Text style={styles.emptyListText}>No categories found. Add one above.</Text>
           </View>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContentContainer}
            style={styles.categoryList}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <ThemedButton
          title={schedulingNotifications ? "Scheduling..." : "Schedule All Birthday Reminders"}
          onPress={handleScheduleAllNotifications}
          disabled={schedulingNotifications || loading}
          type="secondary"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.medium,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  centeredMessage: { // For messages within sections when list is empty
    padding: theme.spacing.medium,
    alignItems: 'center',
  },
  section: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.large,
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
  addCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    paddingVertical: Platform.OS === 'android' ? theme.spacing.small : theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    marginRight: theme.spacing.medium,
    borderRadius: theme.borderRadius.small,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  listHeader: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600', // Semibold
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
  },
  categoryList: {
    maxHeight: 200, // Example max height for scrollable list within section
    borderColor: theme.colors.borderColor,
    borderWidth: 1,
    borderRadius: theme.borderRadius.small,
  },
  categoryItemContainer: {
    backgroundColor: theme.colors.background, // Slightly different for list items
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderColor,
  },
  categoryItemText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
  },
  emptyListText: {
    textAlign: 'center',
    padding: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.lightText,
  },
  listContentContainer: {
    // If needed, e.g. paddingBottom: theme.spacing.medium,
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
  secondaryButton: {
    backgroundColor: theme.colors.secondaryButtonBackground,
  },
  buttonTextBase: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.buttonText, // Default white for primary
  },
  disabledButton: {
    backgroundColor: theme.colors.disabledButtonBackground,
  },
  disabledButtonText: {
    color: theme.colors.disabledButtonText,
  },
});

export default SettingsScreen;
