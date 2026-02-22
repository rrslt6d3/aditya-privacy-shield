use std::panic;

#[tauri::command]
fn sanitize_text(input: String) -> Result<String, String> {
    let email_pattern = r"(?i)[a-z0-9._%+-]+(@| at )[a-z0-9.-]+(\.| dot )[a-z]{2,}";
    let phone_pattern = r"\b(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b";
    
    let re_email = fancy_regex::Regex::new(email_pattern).map_err(|e| format!("Engine Error: {}", e))?;
    let re_phone = fancy_regex::Regex::new(phone_pattern).map_err(|e| format!("Engine Error: {}", e))?;

    let mut result = input;
    result = re_email.replace_all(&result, "[PROTECTED_EMAIL]").to_string();
    result = re_phone.replace_all(&result, "[PROTECTED_PHONE]").to_string();

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    panic::set_hook(Box::new(|panic_info| {
        eprintln!("CRITICAL ALERT: {:?}", panic_info);
    }));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sanitize_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}