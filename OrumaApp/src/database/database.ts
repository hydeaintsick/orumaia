import * as SQLite from 'expo-sqlite';

// Define types for database objects (can be expanded and moved to a types file later)
export interface Category {
  id: number;
  name: string;
}

export interface Contact {
  id: number;
  native_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  category_id?: number | null;
  birthday?: string | null; // ISO YYYY-MM-DD
  food_preferences?: string | null; // JSON string or simple text
  notes?: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface ContactEvent {
  id: number;
  contact_id: number;
  event_name: string;
  event_date?: string | null; // ISO YYYY-MM-DD
  description?: string | null;
}

export interface ContactNews {
  id: number;
  contact_id: number;
  news_item: string;
  date_recorded: string; // ISO datetime
}

// Input types for add/update functions
export type NewContact = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
export type UpdatableContact = Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>;


const DATABASE_NAME = 'oruma.db';

// Open the database
const db = SQLite.openDatabaseSync(DATABASE_NAME);

// Function to initialize the database schema
export const initializeSchema = async (): Promise<void> => {
  await db.withTransactionAsync(async () => {
    // Categories Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // Contacts Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        native_id TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        phone_number TEXT,
        email TEXT,
        category_id INTEGER,
        birthday TEXT,
        food_preferences TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
    `);
    // Trigger to update 'updated_at' timestamp on contacts update
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS update_contacts_updated_at
      AFTER UPDATE ON contacts
      FOR EACH ROW
      BEGIN
        UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);

    // Contact Events Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS contact_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        event_name TEXT NOT NULL,
        event_date TEXT,
        description TEXT,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Contact News Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS contact_news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        news_item TEXT NOT NULL,
        date_recorded TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Pre-populate categories (idempotent due to UNIQUE constraint on name)
    const defaultCategories = [
      "Friends",
      "Family",
      "Work Colleagues",
      "Buddies / Casual Connections"
    ];
    for (const categoryName of defaultCategories) {
      try {
        await db.runAsync('INSERT INTO categories (name) VALUES (?);', [categoryName]);
        console.log(\`Category '\${categoryName}' inserted.\`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          // console.log(\`Category '\${categoryName}' already exists.\`);
        } else {
          console.error(\`Error inserting category '\${categoryName}':\`, error);
          throw error; // re-throw if it's not a UNIQUE constraint error
        }
      }
    }
  });
  console.log('Database schema initialized and default categories populated.');
};

// CRUD Functions

// --- Categories ---
export const addCategory = async (name: string): Promise<SQLite.SQLiteRunResult | null> => {
  try {
    const result = await db.runAsync('INSERT INTO categories (name) VALUES (?);', [name]);
    return result;
  } catch (error) {
    console.error("Error adding category:", error);
    return null;
  }
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
  try {
    const category = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?;', [id]);
    return category ?? null;
  } catch (error) {
    console.error("Error getting category by id:", error);
    return null;
  }
};

export const getCategoryByName = async (name: string): Promise<Category | null> => {
  try {
    const category = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE name = ?;', [name]);
    return category ?? null;
  } catch (error) {
    console.error("Error getting category by name:", error);
    return null;
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const categories = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name;');
    return categories;
  } catch (error) {
    console.error("Error getting all categories:", error);
    return [];
  }
};

// --- Contacts ---
export const addContact = async (contact: NewContact): Promise<SQLite.SQLiteRunResult | null> => {
  const {
    native_id, first_name, last_name, phone_number, email,
    category_id, birthday, food_preferences, notes
  } = contact;
  try {
    const result = await db.runAsync(
      \`INSERT INTO contacts (native_id, first_name, last_name, phone_number, email, category_id, birthday, food_preferences, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);\`,
      [native_id, first_name, last_name, phone_number, email, category_id, birthday, food_preferences, notes]
    );
    return result;
  } catch (error) {
    console.error("Error adding contact:", error);
    return null;
  }
};

export const updateContact = async (id: number, contact: UpdatableContact): Promise<SQLite.SQLiteRunResult | null> => {
  const fields = Object.keys(contact);
  const values = Object.values(contact);

  if (fields.length === 0) {
    return null; // No fields to update
  }

  const setClause = fields.map(field => \`\${field} = ?\`).join(', ');

  try {
    // The updated_at field will be updated by the trigger
    const result = await db.runAsync(
      \`UPDATE contacts SET \${setClause} WHERE id = ?;\`,
      [...values, id]
    );
    return result;
  } catch (error) {
    console.error("Error updating contact:", error);
    return null;
  }
};

export const getContactById = async (id: number): Promise<Contact | null> => {
  try {
    const contact = await db.getFirstAsync<Contact>('SELECT * FROM contacts WHERE id = ?;', [id]);
    return contact ?? null;
  } catch (error) {
    console.error("Error getting contact by id:", error);
    return null;
  }
};

export const getContactByNativeId = async (nativeId: string): Promise<Contact | null> => {
  try {
    const contact = await db.getFirstAsync<Contact>('SELECT * FROM contacts WHERE native_id = ?;', [nativeId]);
    return contact ?? null;
  } catch (error) {
    console.error("Error getting contact by native_id:", error);
    return null;
  }
};

export const getAllContacts = async (): Promise<Contact[]> => {
  try {
    const contacts = await db.getAllAsync<Contact>('SELECT * FROM contacts ORDER BY last_name, first_name;');
    return contacts;
  } catch (error) {
    console.error("Error getting all contacts:", error);
    return [];
  }
};

export const getContactsByCategory = async (categoryId: number): Promise<Contact[]> => {
  try {
    const contacts = await db.getAllAsync<Contact>(
      'SELECT * FROM contacts WHERE category_id = ? ORDER BY last_name, first_name;',
      [categoryId]
    );
    return contacts;
  } catch (error) {
    console.error("Error getting contacts by category:", error);
    return [];
  }
};

export const deleteContact = async (id: number): Promise<SQLite.SQLiteRunResult | null> => {
  try {
    // Related contact_events and contact_news will be deleted by ON DELETE CASCADE
    const result = await db.runAsync('DELETE FROM contacts WHERE id = ?;', [id]);
    return result;
  } catch (error) {
    console.error("Error deleting contact:", error);
    return null;
  }
};

// --- Contact Events ---
export const getEventsForContact = async (contactId: number): Promise<ContactEvent[]> => {
  try {
    const events = await db.getAllAsync<ContactEvent>(
      'SELECT * FROM contact_events WHERE contact_id = ? ORDER BY event_date DESC, id DESC;',
      [contactId]
    );
    return events;
  } catch (error) {
    console.error("Error getting events for contact:", error);
    return [];
  }
};

export const addEventForContact = async (
  contactId: number,
  event: { event_name: string; event_date?: string; description?: string }
): Promise<SQLite.SQLiteRunResult | null> => {
  const { event_name, event_date, description } = event;
  try {
    const result = await db.runAsync(
      'INSERT INTO contact_events (contact_id, event_name, event_date, description) VALUES (?, ?, ?, ?);',
      [contactId, event_name, event_date || null, description || null]
    );
    return result;
  } catch (error) {
    console.error("Error adding event for contact:", error);
    return null;
  }
};

// --- Contact News ---
export const getNewsForContact = async (contactId: number): Promise<ContactNews[]> => {
  try {
    const newsItems = await db.getAllAsync<ContactNews>(
      'SELECT * FROM contact_news WHERE contact_id = ? ORDER BY date_recorded DESC, id DESC;',
      [contactId]
    );
    return newsItems;
  } catch (error) {
    console.error("Error getting news for contact:", error);
    return [];
  }
};

export const addNewsForContact = async (
  contactId: number,
  news: { news_item: string }
): Promise<SQLite.SQLiteRunResult | null> => {
  const { news_item } = news;
  try {
    const result = await db.runAsync(
      'INSERT INTO contact_news (contact_id, news_item) VALUES (?, ?);',
      [contactId, news_item]
    );
    return result;
  } catch (error) {
    console.error("Error adding news for contact:", error);
    return null;
  }
};

// Export the db instance if direct access is needed, though using functions is preferred.
export { db as orumaDb };

// Example of how to initialize:
// initializeSchema().catch(err => console.error("Schema initialization failed:", err));

console.log('Database module loaded. Call initializeSchema() to set up tables.');
