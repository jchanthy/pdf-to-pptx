export const translations = {
  en: {
    app_title: "Khmer DocFixer",
    app_subtitle: "PPTX Khmer Spelling & Unicode Corrector",
    tagline: "Upload your PowerPoint presentation (.pptx) to check and correct Khmer spelling and corrupted characters based on the official Chuon Nath dictionary.",
    
    // Steps
    step_upload: "Upload Presentation",
    step_preview: "Review Spelling",
    step_download: "Download PPTX",
    
    // Upload Zone
    upload_pptx_title: "Upload PowerPoint Presentation",
    upload_pptx_desc: "Select or drag & drop your PowerPoint presentation (.pptx) to check and correct Khmer spelling",
    target_pptx_title: "Target PPTX File",
    target_pptx_desc: "PowerPoint presentation (.pptx) to check and restore",
    reference_pdf_title: "Reference PDF Document",
    reference_pdf_desc: "Optional clean Unicode reference file (.pdf)",
    drag_drop_hint: "Drag and drop your .pptx file here, or click to browse",
    drag_drop_replace: "Click or drag to replace file",
    file_selected: "Selected presentation",
    
    // Options
    options_title: "Spelling & Typography Settings",
    output_font_label: "Target Khmer Font",
    output_font_desc: "All Khmer text runs in slides will be formatted with this clean Unicode typeface",
    mode_label: "Spelling Correction Engine",
    mode_auto: "Smart Auto (Chuon Nath Dictionary + Consonant Matching + Heuristics)",
    mode_pdf: "PDF-Assisted Alignment (Match Slide N to PDF Page N)",
    mode_dict: "Official Dictionary Only (Fast Offline)",
    mode_gemini: "AI Restorer (Google Gemini Multilingual Intelligence)",
    
    gemini_key_title: "Google Gemini API Key (Optional)",
    gemini_key_placeholder: "AIzaSy...",
    gemini_key_desc: "Used for deep contextual semantic restoration of heavily broken Khmer words",
    
    btn_start_processing: "Check & Correct Khmer Spelling",
    btn_convert_pdf: "Check & Correct Khmer Spelling",
    btn_processing: "Checking Spelling & Restoring Unicode...",
    btn_load_sample: "Load Demo Sample (1-Click Test)",
    pdf_only_hint: "Upload a PowerPoint presentation (.pptx) to inspect and correct all Khmer words against the dictionary.",
    
    // Preview / Review
    stats_slides: "Slides Analyzed",
    stats_corrupted: "Corruptions Detected",
    stats_pdf: "PDF Reference Active",
    stats_font: "Target Typeface",
    
    tab_comparison: "Slide-by-Slide Comparison",
    tab_table: "Interactive Review Table",
    
    slide_nav_title: "Slide",
    slide_prev: "Previous Slide",
    slide_next: "Next Slide",
    slide_original: "Before (Corrupted / Legacy)",
    slide_corrected: "After (Restored Unicode)",
    slide_shapes: "Shapes",
    slide_tables: "Tables",
    no_corruptions_slide: "No corrupted text detected on this slide! Clean Unicode preserved.",
    
    // Table
    table_search_placeholder: "Filter by term, slide number, or rule...",
    table_col_slide: "Slide",
    table_col_type: "Element",
    table_col_original: "Original (Corrupted)",
    table_col_replacement: "Restored (Unicode)",
    table_col_source: "Source",
    table_col_confidence: "Confidence",
    table_col_status: "Status",
    table_col_actions: "Action",
    
    source_dictionary: "Dictionary",
    source_heuristic: "Heuristic",
    source_limon: "Limon Translit",
    source_pdf: "PDF Alignment",
    source_gemini: "Gemini AI",
    source_user: "Custom Edit",
    
    btn_accept_all: "Accept All Changes",
    btn_reject_all: "Reject All",
    btn_proceed_download: "Proceed to Download",
    btn_back_upload: "Upload New Document",
    btn_reset_table: "Reset Edits",
    
    // Download
    download_title: "Your Presentation is Ready!",
    download_desc: "All legacy glyphs have been rewritten to clean Khmer Unicode, layouts and formatting preserved, and font set to",
    download_button: "Download Corrected PPTX",
    download_runs_updated: "Text Runs Updated",
    download_file_suffix: "Filename suffix: _fixed.pptx",
    download_start_over: "Process Another Presentation",
    
    // Errors & Alerts
    alert_no_pptx: "Please select a target .pptx file before continuing.",
    alert_error: "An error occurred while processing the presentation.",
    alert_copied: "Copied to clipboard!",
    
    // Common
    accepted: "Accepted",
    rejected: "Rejected",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    edit_slide_text: "Edit Slide Text",
    edit_slide_save: "Apply Text Edit",
    edit_slide_cancel: "Cancel",
    toggle_highlights: "Highlights",
    toggle_clean_view: "Clean View",
    add_custom_fix: "Add Custom Fix",
    add_custom_fix_title: "Add Custom Word Replacement",
    add_custom_orig: "Original word (to replace)",
    add_custom_repl: "Corrected Khmer Unicode word",
    add_custom_submit: "Add Fix Rule",
    all_slides: "All Slides",
  },
  km: {
    app_title: "Khmer DocFixer",
    app_subtitle: "កម្មវិធីពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរក្នុង PowerPoint (PPTX)",
    tagline: "ផ្ទុកឡើងឯកសារ PowerPoint (PPTX) ដើម្បីពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរខូច ឬពុម្ពអក្សរចាស់ ឱ្យត្រឹមត្រូវ ១០០% ផ្អែកលើវចនានុក្រមភាសាខ្មែរ សម្ដេចសង្ឃរាជ ជួន ណាត។",
    
    // Steps
    step_upload: "១. ផ្ទុកឡើងឯកសារ PPTX",
    step_preview: "២. ពិនិត្យ និង ផ្ទៀងផ្ទាត់ពាក្យ",
    step_download: "៣. ទាញយកឯកសារកែរួច",
    
    // Upload Zone
    upload_pptx_title: "ផ្ទុកឡើងឯកសារ PowerPoint (.pptx)",
    upload_pptx_desc: "ជ្រើសរើស ឬទម្លាក់ឯកសារ .pptx របស់អ្នកដើម្បីពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរ",
    target_pptx_title: "ឯកសារ PPTX គោលដៅ",
    target_pptx_desc: "ឯកសារ PowerPoint ដែលត្រូវពិនិត្យ និងកែអក្ខរាវិរុទ្ធ (.pptx)",
    reference_pdf_title: "ឯកសារ PDF យោង (ជម្រើសបន្ថែម)",
    reference_pdf_desc: "ឯកសារ PDF ដែលមានអក្សរយូនីកូដស្អាត សម្រាប់ផ្ទៀងផ្ទាត់ (.pdf)",
    drag_drop_hint: "អូសទម្លាក់ឯកសារ .pptx របស់អ្នកមកទីនេះ ឬ ចុចដើម្បីជ្រើសរើស",
    drag_drop_replace: "ចុច ឬ អូសទម្លាក់ដើម្បីប្តូរឯកសារ",
    file_selected: "ឯកសារដែលបានជ្រើសរើស",
    
    // Options
    options_title: "ការកំណត់ការកែអក្ខរាវិរុទ្ធ និងពុម្ពអក្សរ",
    output_font_label: "ពុម្ពអក្សរខ្មែរគោលដៅ",
    output_font_desc: "រាល់អក្សរខ្មែរនៅក្នុងស្លាយនឹងត្រូវកំណត់ទៅពុម្ពអក្សរយូនីកូដនេះ",
    mode_label: "ម៉ាស៊ីនកែអក្ខរាវិរុទ្ធ",
    mode_auto: "វៃឆ្លាតស្វ័យប្រវត្ត (វចនានុក្រម ជួន ណាត + ផ្គូផ្គងព្យញ្ជនៈ + Heuristic)",
    mode_pdf: "ផ្ទៀងផ្ទាត់ជាមួយ PDF (ផ្គូផ្គងស្លាយ N ជាមួយទំព័រ PDF N)",
    mode_dict: "វចនានុក្រមផ្លូវការ (ដំណើរការលឿន មិនបាច់អ៊ីនធឺណិត)",
    mode_gemini: "ជំនួយការ AI (Google Gemini ស្ដារអត្ថន័យ និងវេយ្យាករណ៍កម្រិតខ្ពស់)",
    
    gemini_key_title: "Google Gemini API Key (ជម្រើសបន្ថែម)",
    gemini_key_placeholder: "AIzaSy...",
    gemini_key_desc: "ប្រើសម្រាប់វិភាគពាក្យបច្ចេកទេស និងកែពាក្យខូចខ្លាំងដែលគ្មានក្នុងវចនានុក្រម",
    
    btn_start_processing: "ពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរ",
    btn_convert_pdf: "ពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរ",
    btn_processing: "កំពុងពិនិត្យអក្ខរាវិរុទ្ធ និងផ្ទៀងផ្ទាត់វចនានុក្រម...",
    btn_load_sample: "សាកល្បងឯកសារគំរូ (១ ចុច)",
    pdf_only_hint: "សូមផ្ទុកឡើងឯកសារ PowerPoint (.pptx) ដើម្បីពិនិត្យ និងកែអក្ខរាវិរុទ្ធអក្សរខ្មែរជូនដោយស្វ័យប្រវត្ត។",
    
    // Preview / Review
    stats_slides: "ចំនួនស្លាយសរុប",
    stats_corrupted: "រកឃើញពាក្យខូច/ចាស់",
    stats_pdf: "ឯកសារ PDF យោង",
    stats_font: "ពុម្ពអក្សរគោលដៅ",
    
    tab_comparison: "ផ្ទៀងផ្ទាត់ស្លាយទន្ទឹមគ្នា",
    tab_table: "តារាងកែប្រែអន្តរកម្ម",
    
    slide_nav_title: "ស្លាយ",
    slide_prev: "ស្លាយមុន",
    slide_next: "ស្លាយបន្ទាប់",
    slide_original: "មុនកែ (អក្សរខូច / ហ្វុនចាស់)",
    slide_corrected: "ក្រោយកែ (យូនីកូដត្រឹមត្រូវ)",
    slide_shapes: "ទម្រង់រូបភាព",
    slide_tables: "តារាង",
    no_corruptions_slide: "ពុំមានពាក្យខូចនៅលើស្លាយនេះទេ! អក្សរយូនីកូដមានភាពត្រឹមត្រូវ។",
    
    // Table
    table_search_placeholder: "ស្វែងរកពាក្យ, លេខស្លាយ ឬ ក្បួនកែ...",
    table_col_slide: "ស្លាយ",
    table_col_type: "ប្រភេទធាតុ",
    table_col_original: "អក្សរដើម (ខូច/ចាស់)",
    table_col_replacement: "អក្សរជំនួស (យូនីកូដ)",
    table_col_source: "ប្រភព",
    table_col_confidence: "កម្រិតជឿជាក់",
    table_col_status: "ស្ថានភាព",
    table_col_actions: "សកម្មភាព",
    
    source_dictionary: "វចនានុក្រម",
    source_heuristic: "ក្បួនតក្កវិជ្ជា",
    source_limon: "បំលែងពី Limon",
    source_pdf: "ផ្ទៀងពី PDF",
    source_gemini: "Gemini AI",
    source_user: "កែប្រែដោយផ្ទាល់",
    
    btn_accept_all: "យល់ព្រមទាំងអស់",
    btn_reject_all: "បដិសេធទាំងអស់",
    btn_proceed_download: "បន្តទៅកាន់ការទាញយក",
    btn_back_upload: "ផ្ទុកឯកសារថ្មី",
    btn_reset_table: "កំណត់ឡើងវិញ",
    
    // Download
    download_title: "ឯកសាររបស់អ្នករួចរាល់ហើយ!",
    download_desc: "រាល់អក្សរចាស់ និងអក្សរខូចត្រូវបានបំលែងទៅជាយូនីកូដត្រឹមត្រូវ ដោយរក្សាទ្រង់ទ្រាយ ពណ៌ ទំហំ និងកំណត់ពុម្ពអក្សរទៅជា",
    download_button: "ទាញយកឯកសារ PPTX ដែលបានកែ",
    download_runs_updated: "ចំនួនបំណែកអក្សរដែលបានកែ",
    download_file_suffix: "កន្ទុយឈ្មោះឯកសារ: _fixed.pptx",
    download_start_over: "ជួសជុលបទបង្ហាញផ្សេងទៀត",
    
    // Errors & Alerts
    alert_no_pptx: "សូមជ្រើសរើសឯកសារ PPTX គោលដៅជាមុនសិន។",
    alert_error: "មានបញ្ហាក្នុងដំណើរការឯកសារ។ សូមព្យាយាមម្តងទៀត។",
    alert_copied: "បានចម្លងរួចរាល់!",
    
    // Common
    accepted: "យល់ព្រម",
    rejected: "បដិសេធ",
    edit: "កែប្រែ",
    save: "រក្សាទុក",
    cancel: "បោះបង់",
    edit_slide_text: "កែប្រែអត្ថបទស្លាយដោយផ្ទាល់",
    edit_slide_save: "អនុវត្តការកែប្រែ",
    edit_slide_cancel: "បោះបង់",
    toggle_highlights: "បង្ហាញចំណាំកែ",
    toggle_clean_view: "មើលអត្ថបទសុទ្ធ",
    add_custom_fix: "បន្ថែមពាក្យកែប្រែថ្មី",
    add_custom_fix_title: "បន្ថែមពាក្យត្រូវជំនួសដោយផ្ទាល់",
    add_custom_orig: "ពាក្យដើម (ពាក្យចាស់/ខូច)",
    add_custom_repl: "ពាក្យជំនួស (យូនីកូដត្រឹមត្រូវ)",
    add_custom_submit: "រក្សាទុកក្បួនកែប្រែ",
    all_slides: "គ្រប់ស្លាយទាំងអស់",
  }
};
