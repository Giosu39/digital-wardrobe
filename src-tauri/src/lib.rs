use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "schema iniziale",
            sql: r#"
            CREATE TABLE items (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                category      TEXT NOT NULL,
                subcategory   TEXT,
                colors        TEXT NOT NULL DEFAULT '[]',
                brand         TEXT,
                size          TEXT,
                material      TEXT,
                seasons       TEXT NOT NULL DEFAULT '[]',
                occasions     TEXT NOT NULL DEFAULT '[]',
                tags          TEXT NOT NULL DEFAULT '[]',
                price         REAL,
                purchase_date TEXT,
                notes         TEXT,
                favorite      INTEGER NOT NULL DEFAULT 0,
                image         TEXT,
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL
            );

            CREATE TABLE outfits (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                occasions  TEXT NOT NULL DEFAULT '[]',
                seasons    TEXT NOT NULL DEFAULT '[]',
                notes      TEXT,
                favorite   INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE outfit_items (
                outfit_id TEXT NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
                item_id   TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                x         REAL NOT NULL,
                y         REAL NOT NULL,
                w         REAL NOT NULL,
                z         INTEGER NOT NULL,
                PRIMARY KEY (outfit_id, item_id)
            );
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "nomi dei colori scelti a mano",
            // Mappa JSON { "#hex": "Nome sfumatura" } con le correzioni manuali dell'utente.
            sql: "ALTER TABLE items ADD COLUMN color_names TEXT NOT NULL DEFAULT '{}';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "sfumature di colore personalizzate",
            sql: r#"
            CREATE TABLE custom_colors (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL UNIQUE,
                hex        TEXT NOT NULL,
                family     TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "foto facoltativa dell'outfit",
            sql: "ALTER TABLE outfits ADD COLUMN image TEXT;",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:guardaroba.db", migrations())
                // Database separato per `npm run app:dev`: le prove in sviluppo non toccano i dati veri.
                .add_migrations("sqlite:guardaroba-dev.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio dell'applicazione");
}
