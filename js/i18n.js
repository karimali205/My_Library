/**
 * i18n.js - Bilingual Internationalization Engine for "My Library / مكتبتي"
 * Fully supports Arabic (RTL) & English (LTR) with instant switching without page reload.
 */

export const TRANSLATIONS = {
  en: {
    appName: "My Library",
    appSubtitle: "Personal Sanctuary of Books",
    
    // Navigation
    navHome: "Home",
    navLibrary: "Library",
    navSmartAdd: "Smart Add",
    navLoans: "Loans",
    navAuthors: "Authors",
    navSeries: "Series",
    navCollections: "Collections",
    navWishlist: "Wishlist",
    navMap: "Library Map",
    navStats: "Statistics",
    navInventory: "Inventory",
    navSettings: "Settings",

    // Common actions & buttons
    add: "Add",
    addNewBook: "Add Book",
    quickAdd: "Quick Add",
    fullAdd: "Full Form",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    search: "Search",
    searchPlaceholder: "Search title, author, ISBN, category...",
    filter: "Filter",
    sort: "Sort",
    clear: "Clear",
    confirm: "Confirm",
    back: "Back",
    restore: "Restore",
    permanentDelete: "Delete Permanently",
    undo: "Undo",
    view: "View",
    export: "Export",
    import: "Import",
    print: "Print",
    share: "Share",
    scan: "Scan",
    apply: "Apply",
    reset: "Reset",
    yes: "Yes",
    no: "No",
    loading: "Loading...",
    noData: "No books found",
    savedSuccessfully: "Saved successfully",
    deletedSuccessfully: "Book moved to trash",
    restoredSuccessfully: "Book restored",
    requiredField: "This field is required",
    actions: "Actions",
    all: "All",
    status: "Status",
    details: "Details",
    select: "Select",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    batchActions: "Batch Actions",

    // Home Screen
    statsTotalBooks: "Total Books",
    statsReadBooks: "Finished",
    statsReadingBooks: "Currently Reading",
    statsOnLoan: "On Loan",
    continueReading: "Continue Reading",
    recentlyAdded: "Recently Added",
    randomSuggestion: "Looking for something to read?",
    suggestAnother: "Roll Again",
    openBook: "Open Book",
    overdueLoansAlert: "Overdue Loans Alert!",
    readingGoal: "Yearly Reading Goal",
    goalPace: "{current} of {target} books read ({percent}%)",
    goalOnTrack: "You're on track! Keep going.",
    goalBehind: "Pace needed: {needed} books/month to hit goal.",
    lastBackup: "Last Backup",
    noBackupYet: "Never backed up",
    backupNow: "Backup Now",
    streakTitle: "Reading Streak",
    streakDays: "{count} days in a row",

    // Library Views
    viewBookshelf: "Bookshelf",
    viewGrid: "Card Grid",
    viewTable: "Table",
    densityLabel: "Density",
    densityCompact: "Compact",
    densityComfortable: "Comfortable",
    densitySpacious: "Spacious",
    sortBy: "Sort by",
    sortTitle: "Title",
    sortAuthor: "Author",
    sortDateAdded: "Date Added",
    sortYear: "Publication Year",
    sortRating: "Rating",
    sortPages: "Page Count",
    sortOrderAsc: "Ascending",
    sortOrderDesc: "Descending",
    selectedCount: "{count} books selected",

    // Filters
    filterCategory: "Category",
    filterStatus: "Reading Status",
    filterLanguage: "Language",
    filterLocation: "Location",
    filterRating: "Rating",
    filterTag: "Tag",
    filterCollection: "Collection",
    filterLoanStatus: "Loan Status",
    filterFavoritesOnly: "Favorites Only",
    savedFilters: "Saved Filter Presets",
    saveCurrentFilter: "Save Current Filter",
    filterNamePlaceholder: "Preset name...",

    // Book Form & Fields
    basicInfoSection: "Basic Information",
    bookTitle: "Book Title",
    bookSubtitle: "Subtitle",
    authors: "Authors",
    authorsHelp: "Separate multiple authors with commas",
    translator: "Translator",
    editor: "Editor",
    publisher: "Publisher",
    publicationYear: "Publication Year",
    edition: "Edition",
    isbn: "ISBN",
    isbnPlaceholder: "10 or 13 digits",
    language: "Book Language",
    langArabic: "Arabic",
    langEnglish: "English",
    langFrench: "French",
    langGerman: "German",
    langOther: "Other",
    pageCount: "Page Count",
    mainCategory: "Main Category",
    subcategory: "Subcategory",
    tags: "Tags",
    tagsHelp: "e.g. classic, sci-fi, philosophy (comma-separated)",
    coverImage: "Cover Image",
    uploadImage: "Upload File",
    useCamera: "Take Photo",
    coverUrl: "Image URL",
    removeCover: "Remove Cover",
    
    physicalLocationSection: "Physical Location & Condition",
    room: "Room",
    cabinet: "Cabinet / Bookcase",
    shelf: "Shelf Level",
    physicalCondition: "Physical Condition",
    conditionNew: "Pristine / New",
    conditionGood: "Good",
    conditionUsed: "Fair / Used",
    conditionDamaged: "Worn / Damaged",
    binding: "Binding",
    bindingPaperback: "Paperback",
    bindingHardcover: "Hardcover",
    copiesCount: "Number of Copies",

    readingProgressSection: "Reading Status & Progress",
    statusUnread: "To Read",
    statusReading: "Reading",
    statusFinished: "Finished",
    statusPaused: "Paused",
    currentPage: "Current Page",
    startDate: "Date Started",
    finishDate: "Date Finished",
    isFavorite: "Favorite Book",

    reviewAndNotesSection: "Review & Personal Notes",
    starRating: "Rating",
    personalReview: "Personal Review / Thoughts",
    quotesAndNotes: "Favorite Quotes & Excerpts",
    addQuote: "+ Add Quote",
    quoteText: "Quote",
    quotePage: "Page #",

    purchaseAndLoanSection: "Acquisition & Lending",
    purchasePrice: "Purchase Price",
    currency: "Currency",
    purchaseDate: "Purchase Date",
    purchasePlace: "Purchased From / Bookstore",
    isGift: "Received as a Gift",
    giverName: "Given by",
    seriesName: "Series Name",
    seriesVolume: "Volume Number",
    collections: "Custom Collections",
    collectionsHelp: "e.g. University, Summer 2024, Heritage (comma separated)",

    // Book Details View
    bookDetailsTitle: "Book Sanctuary Record",
    progress: "Progress",
    pagesRead: "{current} of {total} pages ({percent}%)",
    quotesHeading: "Treasured Quotes",
    loanHeading: "Lending History",
    currentLoan: "Currently Borrowed By",
    expectedReturnDate: "Expected Return",
    overdueWarning: "This book is overdue by {days} days!",
    markReturned: "Mark as Returned",
    lendBook: "Lend This Book",
    borrowerName: "Borrower's Name",
    loanDate: "Lent Date",
    dueDate: "Due Date",
    loanNotes: "Lending Notes",
    relatedBooks: "Related in Your Library",
    printBookLabel: "Print Shelf Label",
    printBookCard: "Print Library Card",

    // Smart Add Screen
    smartAddTitle: "Smart ISBN & Camera Add",
    barcodeScannerTitle: "Scan Barcode with Camera",
    startScanner: "Start Camera Scanner",
    stopScanner: "Stop Camera",
    manualLookupTitle: "Lookup by ISBN or Title",
    lookupBtn: "Fetch Metadata",
    searchingApis: "Searching Open Library & Google Books...",
    continuousScanMode: "Continuous Batch Scanning Mode",
    continuousScanHelp: "Keep camera open and scan book after book smoothly",
    foundBookPreview: "Metadata Found!",
    saveToLibrary: "Confirm & Add to Library",
    checkOwnershipTitle: "Do I Own This Book?",
    checkOwnershipHelp: "Type an ISBN or title to quickly check before purchasing",
    ownershipYes: "YES! You already own this book.",
    ownershipNo: "NO, this book is not in your library.",
    duplicateDetectedTitle: "Duplicate Book Detected",
    duplicateDetectedMsg: "You already have '{title}' by {author} in your library.",
    addAsCopy: "Add as Another Copy",
    viewExisting: "View Existing Book",

    // Authors & Series & Collections Views
    authorsTitle: "Authors Directory",
    booksCount: "{count} books",
    seriesTitle: "Book Series & Cycles",
    seriesVolumesOwned: "{owned} of {total} volumes owned",
    missingVolumes: "Missing Volumes:",
    collectionsTitle: "Curated Collections",
    loansTitle: "Book Lending Tracker",
    activeLoans: "Active Loans",
    pastLoans: "Loan Archive",
    wishlistTitle: "Wishlist (Want to Buy)",
    addToWishlist: "Add to Wishlist",
    moveToLibrary: "Acquired! Move to Library",
    estimatedPrice: "Estimated Price",
    priority: "Priority",
    priorityHigh: "High",
    priorityMedium: "Medium",
    priorityLow: "Low",

    // Library Map
    mapTitle: "Visual Library Blueprint",
    mapHelp: "Navigate rooms, bookcases and shelves. Tap any shelf to browse books residing there.",
    roomsCount: "Rooms",
    bookcasesCount: "Bookcases",
    shelvesCount: "Shelves",
    shelfBooksView: "Books on {location}",

    // Statistics Screen
    statsTitle: "Library Analytics & Insights",
    chartCategories: "Categories Distribution",
    chartLanguages: "Language Breakdown",
    chartPublishers: "Top Publishers",
    chartTopAuthors: "Most Featured Authors",
    chartBooksPerMonth: "Books Added by Month",
    chartReadRatio: "Reading Completion Ratio",
    totalLibraryValue: "Total Estimated Library Value",
    paceCalculation: "Reading Pace & Velocity",

    // Inventory Mode
    inventoryTitle: "Physical Inventory & Shelf Audit",
    inventoryHelp: "Walk through your shelves and check off books. Verify that every physical volume is in its rightful place.",
    startAudit: "Start Shelf Audit",
    selectAuditShelf: "Select Shelf to Audit",
    verifiedBooks: "Verified Books",
    pendingVerification: "Pending Verification",
    markVerified: "Verify In Place",
    finishAudit: "Finish Audit & View Report",
    missingReportTitle: "Shelf Audit Summary",
    missingCount: "{count} books unaccounted for",
    misplacedCount: "{count} misplaced books located",

    // Settings
    settingsTitle: "Library Settings & Configuration",
    generalSettings: "Appearance & Language",
    appLanguage: "Language / اللغة",
    themeChoice: "Visual Theme",
    themeClassicWood: "Classic Wood (Cozy Library)",
    themeCrimsonPearl: "Crimson & Pearl (Red & White Identity)",
    themeDarkAcademia: "Dark Academia (Burgundy & Forest)",
    themeModernMinimal: "Modern Minimal (Clean & Air)",
    themeMidnight: "Midnight Reading (Deep Navy & Lamp)",
    themeSepiaPaper: "Sepia Paper (Vintage Parchment)",
    colorMode: "Color Scheme",
    modeLight: "Daylight (Light)",
    modeDark: "Candlelight (Dark)",
    customAccent: "Custom Brass/Accent Color",
    shelfStyle: "Shelf Surface Texture",
    shelfStyleWood: "Carved Oak Wood",
    shelfStyleMinimal: "Minimalist Floating",
    shelfStyleGlass: "Polished Glass",
    arabicFont: "Arabic Title Font",
    englishFont: "English Title Font",
    fontSize: "Interface Font Size",
    enableAnimations: "Enable Smooth Animations",
    
    dataSafetySection: "Data Management & Backups",
    persistentStorageStatus: "Browser Persistent Storage",
    persistentActive: "Active & Granted (Safe from eviction)",
    persistentInactive: "Not Granted (Click to request)",
    requestPersistence: "Grant Persistent Storage",
    backupIntervalDays: "Remind Me to Backup Every",
    daysCount: "{n} Days",
    snapshotsTitle: "Internal Automatic Snapshots (Rollback Points)",
    restoreSnapshot: "Rollback to this Snapshot",
    exportDataJson: "Export Full Library (JSON)",
    exportDataCsv: "Export Books to CSV / Excel",
    importDataJson: "Import Library (JSON)",
    importDataCsv: "Import from CSV / Excel",
    importModeMerge: "Merge with Existing Books",
    importModeReplace: "Replace Entire Library (Destructive)",
    
    githubSyncTitle: "Private GitHub Repository Sync",
    githubSyncHelp: "Sync your library data with a private repository via GitHub API. Your Personal Access Token is stored strictly in your local browser.",
    githubWarning: "IMPORTANT: Ensure your repository is PRIVATE so your personal library notes stay private.",
    githubToken: "GitHub Personal Access Token (PAT)",
    githubRepo: "Repository Name (e.g. username/my-private-library)",
    githubSyncNowPush: "Push to GitHub",
    githubSyncNowPull: "Pull from GitHub",
    githubLastSync: "Last Synced: {date}",

    dangerZone: "Danger Zone & Reset",
    clearSampleData: "Remove Sample Books Only",
    clearSampleConfirm: "Are you sure you want to remove the sample books? Any books you added yourself will remain untouched.",
    wipeAllData: "Wipe All Data & Start Fresh",
    wipeAllConfirm1: "WARNING: This will permanently delete your entire library, all notes, and images. Are you absolutely certain?",
    wipeAllConfirm2: "Type DELETE below to confirm complete database erasure:",

    // App Lock & Privacy
    privacySection: "Privacy & PIN Lock",
    pinLockEnabled: "Protect Library with PIN",
    setPin: "Set 4-Digit PIN",
    enterPinToUnlock: "Enter PIN to access My Library",
    pinIncorrect: "Incorrect PIN. Try again.",

    // Trash Screen
    trashTitle: "Recycle Bin (Trash)",
    trashHelp: "Books deleted within the last 30 days. You can restore them or permanently delete them.",
    emptyTrash: "Empty Recycle Bin",
    emptyTrashConfirm: "Are you sure you want to permanently delete all items in trash?",
    trashExpiresIn: "Purges in {days} days",

    // Print & Labels
    printCatalogTitle: "Print Library Catalog",
    printLabelsTitle: "Print Spine & QR Labels",
    labelSize: "Label Size",
    labelScope: "Include in Print",
    printNow: "Print Now",

    // About
    aboutTitle: "About My Library",
    appVersion: "Version 1.0.0 (PWA Offline)",
    storageUsed: "Storage Space Used: {size}",
    authorCredit: "Designed for book lovers worldwide."
  },

  ar: {
    appName: "مكتبتي",
    appSubtitle: "ملاذك الدافئ للكتب والقراءة",
    
    // Navigation
    navHome: "الرئيسية",
    navLibrary: "المكتبة",
    navSmartAdd: "إضافة ذكية",
    navLoans: "الإعارات",
    navAuthors: "المؤلفون",
    navSeries: "السلاسل",
    navCollections: "المجموعات",
    navWishlist: "قائمة الرغبات",
    navMap: "خريطة الرفوف",
    navStats: "الإحصائيات",
    navInventory: "الجرد والتدقيق",
    navSettings: "الإعدادات",

    // Common actions & buttons
    add: "إضافة",
    addNewBook: "إضافة كتاب جديد",
    quickAdd: "إضافة سريعة",
    fullAdd: "النموذج الشامل",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    close: "إغلاق",
    search: "بحث",
    searchPlaceholder: "ابحث بالعنوان، المؤلف، الردمك، التصنيف...",
    filter: "تصفية",
    sort: "ترتيب",
    clear: "مسح",
    confirm: "تأكيد",
    back: "رجوع",
    restore: "استعادة",
    permanentDelete: "حذف نهائي",
    undo: "تراجع",
    view: "عرض",
    export: "تصدير",
    import: "استيراد",
    print: "طباعة",
    share: "مشاركة",
    scan: "مسح ضوئي",
    apply: "تطبيق",
    reset: "إعادة ضبط",
    yes: "نعم",
    no: "لا",
    loading: "جارٍ التحميل...",
    noData: "لم يتم العثور على أي كتب",
    savedSuccessfully: "تم الحفظ بنجاح",
    deletedSuccessfully: "تم نقل الكتاب إلى سلة المهملات",
    restoredSuccessfully: "تمت استعادة الكتاب بنجاح",
    requiredField: "هذا الحقل مطلوب",
    actions: "إجراءات",
    all: "الكل",
    status: "الحالة",
    details: "التفاصيل",
    select: "تحديد",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء التحديد",
    batchActions: "إجراءات مجمعة",

    // Home Screen
    statsTotalBooks: "إجمالي الكتب",
    statsReadBooks: "أنهيت قراءتها",
    statsReadingBooks: "قيد القراءة حالياً",
    statsOnLoan: "مُعارة لأصدقاء",
    continueReading: "واصل القراءة",
    recentlyAdded: "أحدث الإضافات للمكتبة",
    randomSuggestion: "محتار ماذا تقرأ الآن؟",
    suggestAnother: "اقتراح آخر",
    openBook: "فتح بطاقة الكتاب",
    overdueLoansAlert: "تنبيه: كتب متأخرة عن موعد الإرجاع!",
    readingGoal: "هدف القراءة السنوي",
    goalPace: "قرأت {current} من {target} كتب ({percent}%)",
    goalOnTrack: "رائع! وتيرتك ممتازة ومطابقة لهدفك السنوي.",
    goalBehind: "تحتاج لمعدل {needed} كتب/شهر للوصول إلى هدفك.",
    lastBackup: "آخر نسخة احتياطية",
    noBackupYet: "لم تُحفظ نسخة بعد",
    backupNow: "نسخ احتياطي الآن",
    streakTitle: "شعلة القراءة اليومية",
    streakDays: "{count} أيام متتالية",

    // Library Views
    viewBookshelf: "الرف الخشبي",
    viewGrid: "شبكة البطاقات",
    viewTable: "جدول مفصل",
    densityLabel: "كثافة الرف",
    densityCompact: "مضغوط",
    densityComfortable: "مريح",
    densitySpacious: "فسيح",
    sortBy: "ترتيب حسب",
    sortTitle: "عنوان الكتاب",
    sortAuthor: "المؤلف",
    sortDateAdded: "تاريخ الإضافة",
    sortYear: "سنة النشر",
    sortRating: "التقييم",
    sortPages: "عدد الصفحات",
    sortOrderAsc: "تصاعدي",
    sortOrderDesc: "تنازلي",
    selectedCount: "تم تحديد {count} كتاب",

    // Filters
    filterCategory: "التصنيف",
    filterStatus: "حالة القراءة",
    filterLanguage: "لغة الكتاب",
    filterLocation: "الموقع الفعلي",
    filterRating: "التقييم",
    filterTag: "الوسوم",
    filterCollection: "المجموعة",
    filterLoanStatus: "حالة الإعارة",
    filterFavoritesOnly: "المفضلة فقط",
    savedFilters: "تصفيات محفوظة",
    saveCurrentFilter: "حفظ التصفية الحالية",
    filterNamePlaceholder: "اسم التصفية...",

    // Book Form & Fields
    basicInfoSection: "البيانات الأساسية",
    bookTitle: "عنوان الكتاب",
    bookSubtitle: "العنوان الفرعي",
    authors: "المؤلف / المؤلفون",
    authorsHelp: "افصل بين أسماء المؤلفين بفواصل",
    translator: "المترجم",
    editor: "المحقق / المحرر",
    publisher: "دار النشر",
    publicationYear: "سنة النشر",
    edition: "رقم الطبعة",
    isbn: "الرقم الدولي الموحد (ردمك / ISBN)",
    isbnPlaceholder: "10 أو 13 رقماً",
    language: "لغة الكتاب",
    langArabic: "العربية",
    langEnglish: "الإنجليزية",
    langFrench: "الفرنسية",
    langGerman: "الألمانية",
    langOther: "أخرى",
    pageCount: "عدد الصفحات",
    mainCategory: "التصنيف الرئيسي",
    subcategory: "التصنيف الفرعي",
    tags: "الوسوم الدلالية",
    tagsHelp: "مثل: رواية، فلسفة، تاريخ أندلسي (مفصولة بفواصل)",
    coverImage: "غلاف الكتاب",
    uploadImage: "رفع صورة الغلاف",
    useCamera: "التقاط بالكاميرا",
    coverUrl: "رابط صورة الغلاف",
    removeCover: "إزالة الغلاف",

    physicalLocationSection: "الموقع الفعلي وحالة النسخة",
    room: "الغرفة / الجناح",
    cabinet: "الخزانة / الدولاب",
    shelf: "رقم الرف",
    physicalCondition: "حالة النسخة المادية",
    conditionNew: "ممتازة / جديدة تماماً",
    conditionGood: "جيدة جداً",
    conditionUsed: "مستعملة ومقروءة",
    conditionDamaged: "مهترئة / تحتاج ترميم",
    binding: "نوع التجليد",
    bindingPaperback: "غلاف ورقي عادي",
    bindingHardcover: "تجليد فني فاخر (كرتون مقوى)",
    copiesCount: "عدد النسخ المتوفرة",

    readingProgressSection: "حالة القراءة والمتابعة",
    statusUnread: "في قائمة الانتظار",
    statusReading: "أقرؤه حالياً",
    statusFinished: "تمت القراءة",
    statusPaused: "متوقف مؤقتاً",
    currentPage: "الصفحة الحالية",
    startDate: "تاريخ بدء القراءة",
    finishDate: "تاريخ إتمام القراءة",
    isFavorite: "من كتبي المفضلة",

    reviewAndNotesSection: "المراجعة والانطباعات والاقتباسات",
    starRating: "تقييمك للكتاب",
    personalReview: "مراجعتك الشخصية وانطباعاتك",
    quotesAndNotes: "درر واقتباسات أعجبتك",
    addQuote: "+ إضافة اقتباس",
    quoteText: "نص الاقتباس",
    quotePage: "الصفحة",

    purchaseAndLoanSection: "الشراء والاقتناء والإعارة",
    purchasePrice: "سعر الشراء",
    currency: "العملة",
    purchaseDate: "تاريخ الشراء",
    purchasePlace: "مكان الشراء / المكتبة أو المعرض",
    isGift: "إهداء من شخص عزيز",
    giverName: "مُهدي الكتاب",
    seriesName: "اسم السلسلة",
    seriesVolume: "رقم المجلد / الجزء",
    collections: "المجموعات المخصصة",
    collectionsHelp: "مثل: مكتبة الوالد، كتب الجامعة، نفائس (مفصولة بفواصل)",

    // Book Details View
    bookDetailsTitle: "سجل وثيقة الكتاب",
    progress: "مستوى التقدم",
    pagesRead: "{current} من أصل {total} صفحة ({percent}%)",
    quotesHeading: "اقتباسات مختارة",
    loanHeading: "سجل الإعارة والأصدقاء",
    currentLoan: "مُعار حالياً إلى",
    expectedReturnDate: "موعد الإرجاع المتوقع",
    overdueWarning: "تنبيه: تأخر إرجاع هذا الكتاب بمقدار {days} يوماً!",
    markReturned: "استلام الكتاب وإنهاء الإعارة",
    lendBook: "إعارة هذا الكتاب",
    borrowerName: "اسم المستعير",
    loanDate: "تاريخ الإعارة",
    dueDate: "موعد الإرجاع",
    loanNotes: "ملاحظات الإعارة ورقم الهاتف",
    relatedBooks: "كتب مشابهة في مكتبتك",
    printBookLabel: "طباعة ملصق الرف",
    printBookCard: "طباعة بطاقة الفهرسة",

    // Smart Add Screen
    smartAddTitle: "إضافة ذكية ومسح الباركود",
    barcodeScannerTitle: "المسح الضوئي لكاميرا الهاتف",
    startScanner: "تشغيل كاميرا الباركود",
    stopScanner: "إيقاف الكاميرا",
    manualLookupTitle: "جلب تلقائي بالردمك (ISBN) أو العنوان",
    lookupBtn: "جلب بيانات الكتاب",
    searchingApis: "جارٍ البحث في قواعد بيانات Open Library و Google Books...",
    continuousScanMode: "وضع المسح المستمر فائق السرعة",
    continuousScanHelp: "يبقي الكاميرا تعمل لمسح كتاب تلو الآخر وحفظها تباعاً",
    foundBookPreview: "تم العثور على بيانات الكتاب بنجاح!",
    saveToLibrary: "تأكيد وإدراج في المكتبة",
    checkOwnershipTitle: "هل أملك هذا الكتاب بالفعل؟",
    checkOwnershipHelp: "اكتب الردمك أو العنوان للتأكد السريع قبل شراء كتاب جديد في المعرض",
    ownershipYes: "نعم! هذا الكتاب موجود في مكتبتك بالفعل.",
    ownershipNo: "لا، هذا الكتاب ليس في مكتبتك.",
    duplicateDetectedTitle: "تنبيه: كتاب متطابق موجود مسبقاً",
    duplicateDetectedMsg: "تم العثور على كتاب '{title}' للمؤلف {author} في مكتبتك.",
    addAsCopy: "إضافة كنسخة ثانية لنفس العنوان",
    viewExisting: "عرض النسخة الموجودة مسبقاً",

    // Authors & Series & Collections Views
    authorsTitle: "دليل المؤلفين والأعلام",
    booksCount: "{count} كتب",
    seriesTitle: "السلاسل والموسوعات",
    seriesVolumesOwned: "تملك {owned} من أصل {total} أجزاء",
    missingVolumes: "الأجزاء الناقصة لاكتمال السلسلة:",
    collectionsTitle: "المجموعات والخزائن الخاصة",
    loansTitle: "سجل إعارات الكتب والأصدقاء",
    activeLoans: "كتب معارة حالياً",
    pastLoans: "أرشيف الإعارات المستردة",
    wishlistTitle: "قائمة الكتب المرجوة (للاقتناء)",
    addToWishlist: "إضافة إلى قائمة الرغبات",
    moveToLibrary: "تم شراؤه! انقله إلى رفوف المكتبة",
    estimatedPrice: "السعر التقريبي",
    priority: "الأولوية",
    priorityHigh: "أولوية قصوى",
    priorityMedium: "متوسطة",
    priorityLow: "منخفضة",

    // Library Map
    mapTitle: "المخطط البصري لأجنحة ورفوف المكتبة",
    mapHelp: "استكشف الغرف، الخزائن، والرفوف. انقر على أي رف لمشاهدة الكتب المصطفة عليه فوراً.",
    roomsCount: "الغرف",
    bookcasesCount: "الخزائن",
    shelvesCount: "الرفوف",
    shelfBooksView: "الكتب المستقرة في: {location}",

    // Statistics Screen
    statsTitle: "تحليلات وإحصاءات وافية للمكتبة",
    chartCategories: "توزيع التصنيفات والموضوعات",
    chartLanguages: "توزيع لغات الكتب",
    chartPublishers: "أبرز دور النشر في مكتبتك",
    chartTopAuthors: "أكثر المؤلفين حضوراً على الرفوف",
    chartBooksPerMonth: "معدل نمو المكتبة شهرياً",
    chartReadRatio: "نسبة الكتب المقروءة مقابل الإجمالي",
    totalLibraryValue: "القيمة المالية التقديرية للمكتبة",
    paceCalculation: "سرعة ومعدل الإنجاز القرائي",

    // Inventory Mode
    inventoryTitle: "جرد المكتبة والتدقيق الميداني",
    inventoryHelp: "مر على الرفوف كتاباً كتاباً وضع علامة تدقيق للتأكد من عدم ضياع أي كتاب وسلامة مواقعه.",
    startAudit: "بدء جرد ميداني جديد",
    selectAuditShelf: "اختر الرف المراد تدقيقه",
    verifiedBooks: "كتب تم تأكيد وجودها",
    pendingVerification: "كتب بانتظار التدقيق",
    markVerified: "تأكيد وجود الكتاب في مكانه",
    finishAudit: "إنهاء الجرد وإصدار التقرير",
    missingReportTitle: "تقرير خلاصة الجرد والمطابقة",
    missingCount: "{count} كتب مفقودة أو غير موجودة بمكانها",
    misplacedCount: "{count} كتب في غير رفوفها المحددة",

    // Settings
    settingsTitle: "إعدادات وتخصيص المكتبة",
    generalSettings: "المظهر واللغة والخطوط",
    appLanguage: "لغة الواجهة / Language",
    themeChoice: "طابع التصميم الجمالي (Theme)",
    themeClassicWood: "الخشب الكلاسيكي (مكتبة دافئة عريقة)",
    themeCrimsonPearl: "الأحمر واللؤلؤي (الهوية البصرية - أحمر وأبيض)",
    themeDarkAcademia: "الأكاديميا الداكنة (خمري وزيتي وذهب عتيق)",
    themeModernMinimal: "المعاصر البسيط (خطوط رفيعة وألوان هادئة)",
    themeMidnight: "قراءة منتصف الليل (كحلي هادئ وإضاءة مصباح خافت)",
    themeSepiaPaper: "ورق السيبيا العتيق (طابع مخطوطات ومطابع حجرية)",
    colorMode: "وضع الإضاءة",
    modeLight: "نهاري (فاتح)",
    modeDark: "ليلي (داكن)",
    customAccent: "لون النحاس والزخارف المخصص",
    shelfStyle: "ملمس وسطح الرفوف",
    shelfStyleWood: "خشب السنديان المحفور",
    shelfStyleMinimal: "رف معلق عائم وبسيط",
    shelfStyleGlass: "زجاج مصقول وشفاف",
    arabicFont: "خط العناوين العربية",
    englishFont: "خط العناوين الإنجليزية",
    fontSize: "حجم خط الواجهة",
    enableAnimations: "تفعيل المؤثرات والحركات الانسيابية",

    dataSafetySection: "سلامة البيانات والنسخ الاحتياطي",
    persistentStorageStatus: "حالة التخزين المستديم في المتصفح",
    persistentActive: "مفعل ومضمون (محمي من الحذف التلقائي للمتصفح)",
    persistentInactive: "غير مضمون بعد (انقر لطلب الحماية)",
    requestPersistence: "تثبيت وتأمين التخزين الدائم",
    backupIntervalDays: "تذكيري بعمل نسخة احتياطية كل",
    daysCount: "{n} أيام",
    snapshotsTitle: "نقاط الاستعادة التلقائية الداخلية (Snapshots)",
    restoreSnapshot: "الرجوع لهذه النقطة الزمنية",
    exportDataJson: "تصدير المكتبة الكاملة مع الصور (JSON)",
    exportDataCsv: "تصدير الكتب إلى إكسل / CSV",
    importDataJson: "استيراد مكتبة من ملف (JSON)",
    importDataCsv: "استيراد من ملف إكسل أو CSV",
    importModeMerge: "دمج مع الكتب الحالية",
    importModeReplace: "استبدال المكتبة بالكامل (حذر)",

    githubSyncTitle: "المزامنة مع مستودع GitHub خاص",
    githubSyncHelp: "مزامنة مشفرة وسحابية لمكتبتك عبر واجهة GitHub API. رمز الوصول يُحفظ محلياً فقط في متصفحك.",
    githubWarning: "تنبيه أمني: تأكد أن مستودع GitHub خاص (Private) للحفاظ على سرية ملاحظاتك وكتبك.",
    githubToken: "رمز وصول GitHub الشخصي (PAT Token)",
    githubRepo: "اسم المستودع (مثال: username/my-private-library)",
    githubSyncNowPush: "رفع النسخة إلى GitHub (Push)",
    githubSyncNowPull: "سحب النسخة من GitHub (Pull)",
    githubLastSync: "آخر مزامنة: {date}",

    dangerZone: "منطقة الحذر والتهيئة",
    clearSampleData: "حذف الكتب التجريبية فقط",
    clearSampleConfirm: "هل أنت متأكد من رغبتك في حذف الكتب التجريبية العشرين؟ كتبك الخاصة التي أضفتها بنفسك لن تُمس إطلاقاً.",
    wipeAllData: "مسح كافة البيانات والبدء من الصفر",
    wipeAllConfirm1: "تحذير شديد: سيتم محو كافة الكتب والملاحظات والصور نهائياً وبلا رجعة. هل أنت متأكد تماماً؟",
    wipeAllConfirm2: "اكتب كلمة DELETE في المربع أدناه لتأكيد المسح التام:",

    // App Lock & Privacy
    privacySection: "الخصوصية وقفل التطبيق برمز سرّي",
    pinLockEnabled: "حماية المكتبة برمز سري (PIN)",
    setPin: "تعيين رمز سري من 4 أرقام",
    enterPinToUnlock: "أدخل الرمز السري للدخول إلى مكتبتك",
    pinIncorrect: "الرمز السري غير صحيح. حاول مجدداً.",

    // Trash Screen
    trashTitle: "سلة المهملات والمحذوفات",
    trashHelp: "الكتب المحذوفة خلال آخر 30 يوماً. يمكنك استعادتها أو إتلافها نهائياً.",
    emptyTrash: "إفراغ سلة المهملات",
    emptyTrashConfirm: "هل أنت متأكد من حذف كافة الكتب في السلة نهائياً؟",
    trashExpiresIn: "تُحذف تلقائياً بعد {days} يوماً",

    // Print & Labels
    printCatalogTitle: "طباعة فهرس المكتبة الشامل",
    printLabelsTitle: "طباعة بطاقات وعلامات الرف (QR)",
    labelSize: "قياس الملصق",
    labelScope: "نطاق الطباعة",
    printNow: "بدء الطباعة الآن",

    // About
    aboutTitle: "عن تطبيق مكتبتي",
    appVersion: "الإصدار 1.0.0 (تطبيق ويب تقدمي PWA يعمل دون إنترنت)",
    storageUsed: "المساحة التخزينية المستخدمة: {size}",
    authorCredit: "صُمم بحب وتقدير لرواد المكتبات ومحبي الكتب الورقية."
  }
};

let currentLanguage = 'ar'; // Default to Arabic as requested by user aesthetic or detect
const listeners = new Set();

export function setLanguage(lang) {
  if (lang !== 'ar' && lang !== 'en') {
    lang = 'ar';
  }
  currentLanguage = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('mylibrary_language', lang);

  // Notify all listeners
  listeners.forEach(fn => {
    try { fn(lang); } catch (e) { console.error('i18n listener error', e); }
  });
}

export function getLanguage() {
  return currentLanguage;
}

export function isRTL() {
  return currentLanguage === 'ar';
}

export function subscribeLanguage(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
  let text = dict[key] || TRANSLATIONS['en'][key] || key;
  
  // Replace tokens {var}
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

/**
 * Arabic string normalization:
 * - strips diacritics / tashkeel (fatha, damma, kasra, sukun, shadda, tanween)
 * - strips tatweel (_)
 * - unifies alif variants (أ, إ, آ, ٱ -> ا)
 * - unifies taa marbuta (ة -> ه)
 * - unifies alif maqsura (ى -> ي)
 */
export function normalizeArabic(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFKD')
    // Remove diacritics
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    // Unify Alifs
    .replace(/[إأآٱ]/g, 'ا')
    // Unify Taa Marbuta
    .replace(/ة/g, 'ه')
    // Unify Yaa / Alif Maqsura
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

/**
 * Universal text search normalization for bilingual search
 */
export function normalizeSearch(text) {
  if (!text) return '';
  return normalizeArabic(text)
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format numbers according to preference: Western (0-9) or Arabic-Indic (٠-٩)
 */
export function formatNumber(num, useIndic = false) {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  if (!useIndic) return str;
  const indicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/\d/g, d => indicDigits[d]);
}

/**
 * Format date nicely with Gregorian or optional Hijri calendar
 */
export function formatDate(dateInput, format = 'gregorian') {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;

  if (format === 'hijri') {
    try {
      return new Intl.DateTimeFormat(currentLanguage === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    } catch {
      // Fallback if islamic calendar not supported
    }
  }

  return new Intl.DateTimeFormat(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

/**
 * Initialize language from storage or navigator
 */
export function initI18n() {
  const saved = localStorage.getItem('mylibrary_language');
  if (saved && (saved === 'ar' || saved === 'en')) {
    setLanguage(saved);
  } else {
    // Default to Arabic or browser language if Arabic
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('ar')) {
      setLanguage('ar');
    } else {
      setLanguage('ar'); // Default app aesthetic as requested
    }
  }
}
