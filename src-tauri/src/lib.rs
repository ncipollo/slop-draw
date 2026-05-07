#![warn(clippy::cognitive_complexity)]

mod menu;

mod commands {
    #[tauri::command]
    pub async fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
        std::fs::write(&path, &contents).map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            menu::build_menu(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::write_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
