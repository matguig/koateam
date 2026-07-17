#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Le démon (sidecar empaqueté) est lancé avec l'app.
            // La fenêtre est jetable ; à terme le démon survivra à sa fermeture
            // (icône barre de menu) — hors périmètre du spike M0.
            if !cfg!(debug_assertions) {
                let sidecar = app.shell().sidecar("daemon")?;
                let (_events, _child) = sidecar.spawn()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de KoaTeam");
}
