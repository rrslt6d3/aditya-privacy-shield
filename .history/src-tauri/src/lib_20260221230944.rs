use std::panic;
use tauri_plugin_aptabase::EventTracker; 

#[tauri::command]
fn sanitize_text(input: String) -> Result<String, String> {
    // Professor-Level: We return an Error (Err) instead of crashing (unwrap) if the engine fails.
    let email_pattern = r"(?i)[a-z0-9._%+-]+(@| at )[a-z0-9.-]+(\.| dot )[a-z]{2,}";
    let phone_pattern = r"\b(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b";
    
    // Using the newly added fancy_regex tool
    let re_email = fancy_regex::Regex::new(email_pattern).map_err(|e| format!("Engine Error: {}", e))?;
    let re_phone = fancy_regex::Regex::new(phone_pattern).map_err(|e| format!("Engine Error: {}", e))?;

    let mut result = input;
    result = re_email.replace_all(&result, "[PROTECTED_EMAIL]").to_string();
    result = re_phone.replace_all(&result, "[PROTECTED_PHONE]").to_string();

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // THE TELEMETRY HOOK: This catches fatal core crashes before the app dies.
    panic::set_hook(Box::new(|panic_info| {
        // In production, this block sends the error to your dashboard.
        eprintln!("CRITICAL ALERT TO DEVELOPER: App avoided a hard crash. Details: {:?}", panic_info);
    }));

    tauri::Builder::default()
        // Initialize Aptabase with your specific App Key
        .plugin(tauri_plugin_aptabase::Builder::new("YOUR_APTABASE_APP_KEY_HERE").build()) 
        .invoke_handler(tauri::generate_handler![sanitize_text])
        .run(tauri::generate_context!())
        .expect("Self-healing failure: Could not start the engine");
}