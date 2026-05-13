use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Utc;
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedactionResult {
    pub redacted_text: String,
    pub items_found: usize,
    pub category_counts: HashMap<String, usize>,
    pub timestamp: String,
    pub original_hash: String,
    pub redacted_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiMatch {
    pub start: usize,
    pub end: usize,
    pub original: String,
    pub replacement: String,
    pub category: String,
}

struct Patterns {
    email:           Regex,
    phone_uk:        Regex,
    phone_intl:      Regex,
    credit_card:     Regex,
    ip_v4:           Regex,
    dob_contextual:  Regex,
    dob_standalone:  Regex,
    nhs_number:      Regex,
    ni_number:       Regex,
    uk_postcode:     Regex,
    uk_sort_code:    Regex,
    uk_vat:          Regex,
    ssn:             Regex,
    iban:            Regex,
    name_contextual: Regex,
}

static PATTERNS: Lazy<Patterns> = Lazy::new(|| Patterns {
    email: Regex::new(r"(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}").unwrap(),
    phone_uk: Regex::new(r"(?:\+44[\s\-]?|0)(?:(?:1[0-9]{3}|2[0-9]{3}|3[0-9]{2}|7[0-9]{3}|8[0-9]{3})[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,4})").unwrap(),
    phone_intl: Regex::new(r"\+[1-9][0-9]{1,2}[\s\-\.]?\(?[0-9]{1,4}\)?[\s\-\.]?[0-9]{1,4}[\s\-\.]?[0-9]{1,9}").unwrap(),
    credit_card: Regex::new(r"(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{0,4}").unwrap(),
    ip_v4: Regex::new(r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b").unwrap(),
    dob_contextual: Regex::new(r"(?i)(?:born(?:\s+on)?|date\s+of\s+birth|d\.?o\.?b\.?)\s*:?\s*([0-9]{1,2}[/\-\.][0-9]{1,2}[/\-\.][0-9]{2,4})").unwrap(),
    dob_standalone: Regex::new(r"\b(?:0?[1-9]|[12][0-9]|3[01])[/\-\.](?:0?[1-9]|1[0-2])[/\-\.](?:19|20)[0-9]{2}\b").unwrap(),
    nhs_number: Regex::new(r"\b[0-9]{3}[\s]?[0-9]{3}[\s]?[0-9]{4}\b").unwrap(),
    ni_number: Regex::new(r"(?i)[A-Z]{2}[0-9]{6}[A-D]").unwrap(),
    uk_postcode: Regex::new(r"(?i)\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][ABD-HJLNP-UW-Z]{2}\b").unwrap(),
    uk_sort_code: Regex::new(r"\b[0-9]{2}-[0-9]{2}-[0-9]{2}\b").unwrap(),
    uk_vat: Regex::new(r"(?i)\bGB[0-9]{9}(?:[0-9]{3})?\b").unwrap(),
    ssn: Regex::new(r"\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b").unwrap(),
    iban: Regex::new(r"(?i)\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7,}[A-Z0-9]{0,16}\b").unwrap(),
    name_contextual: Regex::new(r"(?i)(?:patient\s*:|name\s*:|dear\s+(?:dr\.?\s*|mr\.?\s*|mrs\.?\s*|ms\.?\s*)?|re\s*:|from\s*:|to\s*:)\s*([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,3})").unwrap(),
});

fn luhn_check(number: &str) -> bool {
    let digits: Vec<u32> = number.chars().filter(|c| c.is_ascii_digit()).map(|c| c.to_digit(10).unwrap()).collect();
    if digits.len() < 13 || digits.len() > 19 { return false; }
    let sum: u32 = digits.iter().rev().enumerate().map(|(i, &d)| {
        if i % 2 == 1 { let v = d * 2; if v > 9 { v - 9 } else { v } } else { d }
    }).sum();
    sum % 10 == 0
}

fn nhs_valid(number: &str) -> bool {
    let digits: Vec<u32> = number.chars().filter(|c| c.is_ascii_digit()).map(|c| c.to_digit(10).unwrap()).collect();
    if digits.len() != 10 { return false; }
    let weighted: u32 = digits[..9].iter().enumerate().map(|(i, &d)| d * (10 - i as u32)).sum();
    let remainder = weighted % 11;
    let check = 11 - remainder;
    match check { 11 => digits[9] == 0, 10 => false, n => digits[9] == n }
}

fn iban_valid(iban: &str) -> bool {
    let cleaned: String = iban.chars().filter(|c| c.is_alphanumeric()).collect();
    if cleaned.len() < 15 || cleaned.len() > 34 { return false; }
    let rearranged = format!("{}{}", &cleaned[4..], &cleaned[..4]);
    let numeric: String = rearranged.chars().map(|c| {
        if c.is_ascii_alphabetic() { format!("{}", c.to_ascii_uppercase() as u32 - 55) } else { c.to_string() }
    }).collect();
    let mut remainder: u64 = 0;
    for ch in numeric.chars() { if let Some(d) = ch.to_digit(10) { remainder = (remainder * 10 + d as u64) % 97; } }
    remainder == 1
}

const INVALID_NI: &[&str] = &["BG","GB","NK","KN","TN","NT","ZZ","OO","QQ","FY","YF"];

fn no_overlap(matches: &[PiiMatch], start: usize, end: usize) -> bool {
    !matches.iter().any(|e| start < e.end && end > e.start)
}

fn push(matches: &mut Vec<PiiMatch>, start: usize, end: usize, original: &str, replacement: &str, category: &str) {
    matches.push(PiiMatch { start, end, original: original.to_string(), replacement: replacement.to_string(), category: category.to_string() });
}

fn detect_all(text: &str, enabled: &[&str]) -> Vec<PiiMatch> {
    let mut m: Vec<PiiMatch> = Vec::new();
    let p = &*PATTERNS;
    let on = |cat: &str| enabled.is_empty() || enabled.contains(&cat);

    if on("email") {
        for x in p.email.find_iter(text) {
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[EMAIL]", "Email Address"); }
        }
    }
    if on("phone") {
        for x in p.phone_uk.find_iter(text) {
            if x.as_str().chars().filter(|c| c.is_ascii_digit()).count() >= 10 && no_overlap(&m, x.start(), x.end()) {
                push(&mut m, x.start(), x.end(), x.as_str(), "[PHONE]", "UK Phone Number");
            }
        }
        for x in p.phone_intl.find_iter(text) {
            if x.as_str().chars().filter(|c| c.is_ascii_digit()).count() >= 7 && no_overlap(&m, x.start(), x.end()) {
                push(&mut m, x.start(), x.end(), x.as_str(), "[PHONE]", "International Phone");
            }
        }
    }
    if on("cc") {
        for x in p.credit_card.find_iter(text) {
            let d = x.as_str().chars().filter(|c| c.is_ascii_digit()).count();
            if (d == 15 || d == 16) && luhn_check(x.as_str()) && no_overlap(&m, x.start(), x.end()) {
                push(&mut m, x.start(), x.end(), x.as_str(), "[CREDIT CARD]", "Credit Card Number");
            }
        }
    }
    if on("nhs") {
        for x in p.nhs_number.find_iter(text) {
            if nhs_valid(x.as_str()) && no_overlap(&m, x.start(), x.end()) {
                push(&mut m, x.start(), x.end(), x.as_str(), "[NHS NUMBER]", "NHS Number");
            }
        }
    }
    if on("ni") {
        for x in p.ni_number.find_iter(text) {
            let raw = x.as_str().to_uppercase();
            if INVALID_NI.contains(&&raw[..2]) { continue; }
            let before = x.start().checked_sub(1).and_then(|i| text.as_bytes().get(i)).map(|&b| b.is_ascii_alphanumeric()).unwrap_or(false);
            let after = text.as_bytes().get(x.end()).map(|&b| b.is_ascii_alphanumeric()).unwrap_or(false);
            if before || after { continue; }
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[NI NUMBER]", "National Insurance Number"); }
        }
    }
    if on("postcode") {
        for x in p.uk_postcode.find_iter(text) {
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[POSTCODE]", "UK Postcode"); }
        }
    }
    if on("sortcode") {
        for x in p.uk_sort_code.find_iter(text) {
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[SORT CODE]", "Bank Sort Code"); }
        }
    }
    if on("ssn") {
        for x in p.ssn.find_iter(text) {
            let parts: Vec<&str> = x.as_str().split('-').collect();
            if parts.len() == 3 {
                let area: u32 = parts[0].parse().unwrap_or(0);
                let group: u32 = parts[1].parse().unwrap_or(0);
                let serial: u32 = parts[2].parse().unwrap_or(0);
                if area == 0 || area == 666 || area >= 900 || group == 0 || serial == 0 { continue; }
                if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[SSN]", "Social Security Number"); }
            }
        }
    }
    if on("iban") {
        for x in p.iban.find_iter(text) {
            if iban_valid(x.as_str()) && no_overlap(&m, x.start(), x.end()) {
                push(&mut m, x.start(), x.end(), x.as_str(), "[IBAN]", "IBAN");
            }
        }
    }
    if on("vat") {
        for x in p.uk_vat.find_iter(text) {
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[VAT NUMBER]", "UK VAT Number"); }
        }
    }
    if on("ip") {
        for x in p.ip_v4.find_iter(text) {
            let ip = x.as_str();
            if ip == "127.0.0.1" || ip == "0.0.0.0" || ip.starts_with("192.168.") { continue; }
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), ip, "[IP ADDRESS]", "IP Address"); }
        }
    }
    if on("dob") {
        for cap in p.dob_contextual.captures_iter(text) {
            if let Some(x) = cap.get(1) {
                if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[DATE OF BIRTH]", "Date of Birth"); }
            }
        }
        for x in p.dob_standalone.find_iter(text) {
            if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[DATE]", "Date"); }
        }
    }
    if on("name") {
        for cap in p.name_contextual.captures_iter(text) {
            if let Some(x) = cap.get(1) {
                if no_overlap(&m, x.start(), x.end()) { push(&mut m, x.start(), x.end(), x.as_str(), "[PERSON NAME]", "Person Name"); }
            }
        }
    }

    m.sort_by_key(|x| x.start);
    let mut out: Vec<PiiMatch> = Vec::new();
    for x in m { if no_overlap(&out, x.start, x.end) { out.push(x); } }
    out
}

fn apply_redactions(text: &str, matches: &[PiiMatch]) -> String {
    let mut result = String::with_capacity(text.len());
    let mut last = 0usize;
    for m in matches {
        if m.start > last { result.push_str(&text[last..m.start]); }
        result.push_str(&m.replacement);
        last = m.end;
    }
    if last < text.len() { result.push_str(&text[last..]); }
    result
}

#[tauri::command]
pub fn sanitize_text(input: String, enabled_filters: Option<Vec<String>>) -> RedactionResult {
    let filters: Vec<String> = enabled_filters.unwrap_or_else(|| vec![
        "email".into(),"phone".into(),"cc".into(),"nhs".into(),"ni".into(),
        "ssn".into(),"postcode".into(),"iban".into(),"dob".into(),"name".into(),
        "ip".into(),"vat".into(),"sortcode".into(),
    ]);
    let enabled: Vec<&str> = filters.iter().map(|s| s.as_str()).collect();
    let matches = detect_all(&input, &enabled);
    let redacted = apply_redactions(&input, &matches);
    let mut category_counts: HashMap<String, usize> = HashMap::new();
    for m in &matches { *category_counts.entry(m.category.clone()).or_insert(0) += 1; }
    RedactionResult {
        redacted_text: redacted,
        items_found: matches.len(),
        category_counts,
        timestamp: Utc::now().to_rfc3339(),
        original_hash: format!("{:x}", Sha256::digest(input.as_bytes())),
        redacted_hash: format!("{:x}", Sha256::digest(apply_redactions(&input, &detect_all(&input, &enabled)).as_bytes())),
    }
}

#[tauri::command]
pub fn preview_redactions(input: String, enabled_filters: Option<Vec<String>>) -> Vec<PiiMatch> {
    let filters: Vec<String> = enabled_filters.unwrap_or_else(|| vec![
        "email".into(),"phone".into(),"cc".into(),"nhs".into(),"ni".into(),
        "ssn".into(),"postcode".into(),"iban".into(),"dob".into(),"name".into(),
    ]);
    let enabled: Vec<&str> = filters.iter().map(|s| s.as_str()).collect();
    detect_all(&input, &enabled)
}

#[tauri::command]
pub fn validate_nhs(number: String) -> bool { nhs_valid(&number) }

#[tauri::command]
pub fn get_engine_info() -> serde_json::Value {
    serde_json::json!({
        "version": "2.0.0",
        "engine": "Shield Pro PII Engine",
        "categories": 13,
        "offline": true
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            sanitize_text,
            preview_redactions,
            validate_nhs,
            get_engine_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
