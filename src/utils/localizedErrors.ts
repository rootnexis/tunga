import type { LangCode } from '@/i18n/types';

/**
 * Maps system errors, Supabase auth responses, and standard toast notifications
 * into the selected user interface language (English, French, Kinyarwanda, Swahili).
 */
const TOAST_TRANSLATIONS: Record<string, Record<LangCode, string>> = {
  // Auth & login
  'Sign in failed': {
    en: 'Sign in failed',
    fr: 'Échec de connexion',
    rw: 'Kwinjira ntibikunze',
    sw: 'Kuingia kumeshindikana',
  },
  'Invalid login credentials': {
    en: 'Invalid login credentials',
    fr: 'Identifiants de connexion invalides',
    rw: 'Imyirondoro yo kwinjira si yo',
    sw: 'Taarifa za kuingia si sahihi',
  },
  'User already registered': {
    en: 'An account with this email already exists',
    fr: 'Un compte avec cette adresse email existe déjà',
    rw: 'Konti ifite iyi imeri isanzwe ihari',
    sw: 'Akaunti yenye barua pepe hii tayari ipo',
  },
  'Email not confirmed': {
    en: 'Please verify your email address before signing in',
    fr: 'Veuillez vérifier votre adresse email avant de vous connecter',
    rw: 'Banza wemeze imeri yawe mbere yo kwinjira',
    sw: 'Tafadhali thibitisha barua pepe yako kabla ya kuingia',
  },
  'Registration failed': {
    en: 'Registration failed',
    fr: "Échec de l'inscription",
    rw: 'Kwiyandikisha ntibikunze',
    sw: 'Kujisajili kumeshindikana',
  },
  'Could not send email': {
    en: 'Could not send email',
    fr: "Impossible d'envoyer l'email",
    rw: 'Imeri ntiyabashije koherezwa',
    sw: 'Haikuweza kutuma barua pepe',
  },
  'You are now signed in.': {
    en: 'You are now signed in.',
    fr: 'Vous êtes maintenant connecté.',
    rw: 'Ubu winjiye muri konti yawe.',
    sw: 'Umeingia sasa.',
  },
  'Welcome back': {
    en: 'Welcome back',
    fr: 'Bon retour',
    rw: 'Murakaza neza',
    sw: 'Karibu tena',
  },

  // Validation
  'Passwords do not match': {
    en: 'Passwords do not match',
    fr: 'Les mots de passe ne correspondent pas',
    rw: 'Amagambo banga ntabwo ahuye',
    sw: 'Nenosiri hazilingani',
  },
  'Password too short': {
    en: 'Password too short',
    fr: 'Mot de passe trop court',
    rw: 'Ijambobanga ni rigufi cyane',
    sw: 'Nenosiri ni fupi mno',
  },
  'Must be at least 8 characters': {
    en: 'Must be at least 8 characters',
    fr: 'Doit comporter au moins 8 caractères',
    rw: 'Rigomba kugira byibuze inyuguti 8',
    sw: 'Lazima liwe na angalau herufi 8',
  },
  'Password should be at least 6 characters': {
    en: 'Password should be at least 6 characters',
    fr: 'Le mot de passe doit comporter au moins 6 caractères',
    rw: 'Ijambobanga rigomba kugira byibuze inyuguti 6',
    sw: 'Nenosiri linapaswa kuwa na angalau herufi 6',
  },
  'Enter a valid email': {
    en: 'Enter a valid email address',
    fr: 'Entrez une adresse email valide',
    rw: 'Andika imeri y\'ukuri',
    sw: 'Weka barua pepe sahihi',
  },

  // Profile & passwords
  'Could not save': {
    en: 'Could not save',
    fr: "Impossible d'enregistrer",
    rw: 'Ntibikunze kubika',
    sw: 'Imeshindikana kuhifadhi',
  },
  'Could not update password': {
    en: 'Could not update password',
    fr: 'Impossible de modifier le mot de passe',
    rw: 'Ntibikunze guhindura ijambobanga',
    sw: 'Imeshindikana kubadilisha nenosiri',
  },
  'Profile updated': {
    en: 'Profile updated successfully',
    fr: 'Profil mis à jour avec succès',
    rw: 'Umwirondoro wavuguruwe neza',
    sw: 'Wasifu umesasishwa kikamilifu',
  },
  'Password changed': {
    en: 'Password changed successfully',
    fr: 'Mot de passe modifié avec succès',
    rw: 'Ijambobanga ryahinduwe neza',
    sw: 'Nenosiri limebadilishwa kikamilifu',
  },

  // Support
  'Could not create ticket': {
    en: 'Could not create ticket',
    fr: 'Impossible de créer le ticket',
    rw: 'Ntibikunze kurema itike',
    sw: 'Imeshindikana kuanzisha tiketi',
  },
  'Ticket submitted': {
    en: 'Ticket submitted',
    fr: 'Ticket envoyé',
    rw: 'Itike yoherejwe',
    sw: 'Tiketi imewasilishwa',
  },
  "We'll respond within 24 hours.": {
    en: "We'll respond within 24 hours.",
    fr: 'Nous vous répondrons dans les 24 heures.',
    rw: 'Tuzagusubiza mu masaha 24.',
    sw: 'Tutakujibu ndani ya saa 24.',
  },

  // Addresses
  'Address added': {
    en: 'Address added successfully',
    fr: 'Adresse ajoutée avec succès',
    rw: 'Aderesi yongewemo neza',
    sw: 'Anwani imeongezwa kikamilifu',
  },
  'Address updated': {
    en: 'Address updated successfully',
    fr: 'Adresse mise à jour avec succès',
    rw: 'Aderesi yavuguruwe neza',
    sw: 'Anwani imesasishwa kikamilifu',
  },
  'Address deleted': {
    en: 'Address deleted successfully',
    fr: 'Adresse supprimée avec succès',
    rw: 'Aderesi yasibwe neza',
    sw: 'Anwani imefutwa kikamilifu',
  },
  'Default address updated': {
    en: 'Default address updated',
    fr: 'Adresse par défaut mise à jour',
    rw: "Aderesi y'ibanze yavuguruwe",
    sw: 'Anwani chaguo-msingi imesasishwa',
  },
  'Could not delete': {
    en: 'Could not delete',
    fr: 'Impossible de supprimer',
    rw: 'Ntibikunze gusiba',
    sw: 'Imeshindikana kufuta',
  },

  // Orders
  'Order failed': {
    en: 'Order failed',
    fr: 'Échec de la commande',
    rw: 'Gutumiza ntibikunze',
    sw: 'Agizo limeshindikana',
  },
};

export function localizeToastText(text: string | undefined, lang: LangCode): string | undefined {
  if (!text) return text;
  const trimmed = text.trim();
  const entry = TOAST_TRANSLATIONS[trimmed];
  if (entry && entry[lang]) {
    return entry[lang];
  }
  return text;
}
