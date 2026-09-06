// ── Translation type ──────────────────────────────────────────────────────
export type LangCode = 'en' | 'fr' | 'rw' | 'sw';

export interface Translations {
  // Meta
  siteName: string;
  // Nav
  nav: {
    shop: string;
    newArrivals: string;
    featured: string;
    about: string;
    contact: string;
    signIn: string;
    getStarted: string;
    myDashboard: string;
    myOrders: string;
    notifications: string;
    accountSettings: string;
    adminPanel: string;
    signOut: string;
    createAccount: string;
    searchPlaceholder: string;
    close: string;
  };
  // Home
  home: {
    heroBadge: string;
    heroTitle: string;
    heroTitleAccent: string;
    heroDesc: string;
    shopNow: string;
    newArrivals: string;
    // Benefits
    freeShipping: string;
    freeShippingDesc: string;
    securePayments: string;
    securePaymentsDesc: string;
    returns: string;
    returnsDesc: string;
    support: string;
    supportDesc: string;
    // Categories
    exploreLabel: string;
    shopByCategory: string;
    shopByCategoryDesc: string;
    catElectronics: string;
    catClothing: string;
    catHomeGarden: string;
    catSports: string;
    catBeauty: string;
    catBooks: string;
    catToys: string;
    catNewArrivals: string;
    // Featured
    handpicked: string;
    featuredProducts: string;
    viewAll: string;
    featuredSoon: string;
    // Promo banner
    limitedTime: string;
    promoTitle: string;
    promoDesc: string;
    shopTheSale: string;
    joinFree: string;
  };
  // Shop
  shop: {
    allProducts: string;
    searchProducts: string;
    search: string;
    products: string;
    filters: string;
    newestFirst: string;
    priceAsc: string;
    priceDesc: string;
    topRated: string;
    priceRange: string;
    category: string;
    inStockOnly: string;
    minRating: string;
    stars: string;
    clearFilters: string;
    noProducts: string;
    noProductsDesc: string;
    browseAll: string;
  };
  // Auth
  auth: {
    welcomeBack: string;
    signInContinue: string;
    emailAddress: string;
    password: string;
    forgotPassword: string;
    signIn: string;
    signingIn: string;
    noAccount: string;
    registerHere: string;
    createAccount: string;
    joinStorefront: string;
    firstName: string;
    lastName: string;
    confirmPassword: string;
    registerBtn: string;
    registering: string;
    hasAccount: string;
    signInHere: string;
    resetPassword: string;
    resetDesc: string;
    sendResetLink: string;
    sending: string;
    checkEmail: string;
    checkEmailDesc: string;
    backToLogin: string;
    verifyEmail: string;
    verifyEmailDesc: string;
  };
  // Account
  account: {
    dashboard: string;
    orders: string;
    wishlist: string;
    addresses: string;
    notifications: string;
    support: string;
    profile: string;
    greeting: string;
    recentOrders: string;
    noOrders: string;
    noOrdersDesc: string;
    savedItems: string;
    savedAddresses: string;
  };
  // Cart
  cart: {
    title: string;
    empty: string;
    emptyDesc: string;
    continueShopping: string;
    subtotal: string;
    checkout: string;
    remove: string;
  };
  // Checkout
  checkout: {
    title: string;
    shippingAddress: string;
    deliveryMethod: string;
    discountCode: string;
    reviewPay: string;
    orderConfirmed: string;
    thankYou: string;
    back: string;
    continue: string;
    placeOrder: string;
    viewOrder: string;
    apply: string;
    couponApplied: string;
    saving: string;
    remove: string;
    free: string;
  };
  // Common
  common: {
    loading: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    confirm: string;
    yes: string;
    no: string;
    home: string;
    currency: string;
    total: string;
    subtotal: string;
    discount: string;
    tax: string;
    delivery: string;
    status: string;
    date: string;
    or: string;
    setDefault: string;
    default: string;
    active: string;
    inactive: string;
  };
  // Footer
  footer: {
    tagline: string;
    shopLinks: string;
    accountLinks: string;
    companyLinks: string;
    legalLinks: string;
    newsletter: string;
    newsletterDesc: string;
    emailPlaceholder: string;
    subscribe: string;
    copyright: string;
    privacy: string;
    terms: string;
    sitemap: string;
  };
  // Pages
  about: {
    title: string;
    subtitle: string;
    ourStory: string;
    ourStoryTitle: string;
    ourStoryDesc: string;
  };
  contact: {
    title: string;
    subtitle: string;
    sendMessage: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    send: string;
    sending: string;
  };
  faq: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    noResults: string;
  };
  // Policies nav links
  policies: {
    terms: string;
    privacy: string;
    shipping: string;
    returns: string;
  };
  // FAQ Page
  faqPage: {
    title: string;
    subtitle: string;
    items: Array<{ q: string; a: string }>;
  };
  // Terms Page
  termsPage: {
    title: string;
    lastUpdated: string;
    intro: string;
    s1Title: string;
    s1Content: string;
    s2Title: string;
    s2Content: string;
    s3Title: string;
    s3Content: string;
    s4Title: string;
    s4Content: string;
    s5Title: string;
    s5Content: string;
    s6Title: string;
    s6Content: string;
    s7Title: string;
    s7Content: string;
    s8Title: string;
    s8Content: string;
  };
  // Privacy Page
  privacyPage: {
    title: string;
    lastUpdated: string;
    intro: string;
    s1Title: string;
    s1Items: string[];
    s2Title: string;
    s2Content: string;
    s3Title: string;
    s3Content: string;
    s4Title: string;
    s4Content: string;
    s5Title: string;
    s5Content: string;
    s6Title: string;
    s6Content: string;
    s7Title: string;
    s7Content: string;
  };
  // Shipping Policy Page
  shippingPage: {
    title: string;
    subtitle: string;
    s1Title: string;
    s1Content: string;
    s2Title: string;
    s2Items: Array<{ label: string; desc: string }>;
    s3Title: string;
    s3Content: string;
    s4Title: string;
    s4Content: string;
    s5Title: string;
    s5Content: string;
  };
  // Returns Policy Page
  returnsPage: {
    title: string;
    subtitle: string;
    s1Title: string;
    s1Content: string;
    s2Title: string;
    s2Items: string[];
    s3Title: string;
    s3Steps: string[];
    s4Title: string;
    s4Content: string;
    s5Title: string;
    s5Content: string;
    s6Title: string;
    s6Content: string;
    supportCenter: string;
  };
}
