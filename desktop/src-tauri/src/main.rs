#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Le démon (sidecar empaqueté) est lancé avec l'app et survit à la
            // fermeture de la fenêtre — l'entreprise tourne 24/7 (SPEC §5.2).
            if !cfg!(debug_assertions) {
                let sidecar = app.shell().sidecar("daemon")?;
                let (_events, _child) = sidecar.spawn()?;
            }

            // Icône barre de menu : la présence permanente de l'entreprise
            let open = MenuItem::with_id(app, "open", "Ouvrir KoaTeam", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quitter (arrête l'entreprise)", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            TrayIconBuilder::with_id("koateam-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("KoaTeam — votre entreprise tourne")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Fermer la fenêtre ne quitte pas : l'UI est jetable (RAM rendue),
            // le démon et l'icône de barre de menu restent.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de KoaTeam");
}
