/**
 * List of countries with ISO 3166-1 alpha-2 codes
 * Sorted alphabetically by Czech name
 */

export interface Country {
  code: string;
  name: string;
  nameEn: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CZ', name: 'Česká republika', nameEn: 'Czech Republic' },
  { code: 'SK', name: 'Slovensko', nameEn: 'Slovakia' },
  { code: 'PL', name: 'Polsko', nameEn: 'Poland' },
  { code: 'DE', name: 'Německo', nameEn: 'Germany' },
  { code: 'AT', name: 'Rakousko', nameEn: 'Austria' },
  { code: 'HU', name: 'Maďarsko', nameEn: 'Hungary' },
  { code: 'FR', name: 'Francie', nameEn: 'France' },
  { code: 'IT', name: 'Itálie', nameEn: 'Italy' },
  { code: 'ES', name: 'Španělsko', nameEn: 'Spain' },
  { code: 'GB', name: 'Velká Británie', nameEn: 'United Kingdom' },
  { code: 'IE', name: 'Irsko', nameEn: 'Ireland' },
  { code: 'BE', name: 'Belgie', nameEn: 'Belgium' },
  { code: 'NL', name: 'Nizozemsko', nameEn: 'Netherlands' },
  { code: 'CH', name: 'Švýcarsko', nameEn: 'Switzerland' },
  { code: 'SE', name: 'Švédsko', nameEn: 'Sweden' },
  { code: 'NO', name: 'Norsko', nameEn: 'Norway' },
  { code: 'DK', name: 'Dánsko', nameEn: 'Denmark' },
  { code: 'FI', name: 'Finsko', nameEn: 'Finland' },
  { code: 'US', name: 'Spojené státy americké', nameEn: 'United States' },
  { code: 'CA', name: 'Kanada', nameEn: 'Canada' },
  { code: 'AU', name: 'Austrálie', nameEn: 'Australia' },
  { code: 'NZ', name: 'Nový Zéland', nameEn: 'New Zealand' },
  { code: 'JP', name: 'Japonsko', nameEn: 'Japan' },
  { code: 'CN', name: 'Čína', nameEn: 'China' },
  { code: 'KR', name: 'Jižní Korea', nameEn: 'South Korea' },
  { code: 'IN', name: 'Indie', nameEn: 'India' },
  { code: 'BR', name: 'Brazílie', nameEn: 'Brazil' },
  { code: 'MX', name: 'Mexiko', nameEn: 'Mexico' },
  { code: 'AR', name: 'Argentina', nameEn: 'Argentina' },
  { code: 'CL', name: 'Chile', nameEn: 'Chile' },
  { code: 'PT', name: 'Portugalsko', nameEn: 'Portugal' },
  { code: 'GR', name: 'Řecko', nameEn: 'Greece' },
  { code: 'TR', name: 'Turecko', nameEn: 'Turkey' },
  { code: 'RU', name: 'Rusko', nameEn: 'Russia' },
  { code: 'UA', name: 'Ukrajina', nameEn: 'Ukraine' },
  { code: 'RO', name: 'Rumunsko', nameEn: 'Romania' },
  { code: 'BG', name: 'Bulharsko', nameEn: 'Bulgaria' },
  { code: 'HR', name: 'Chorvatsko', nameEn: 'Croatia' },
  { code: 'SI', name: 'Slovinsko', nameEn: 'Slovenia' },
  { code: 'EE', name: 'Estonsko', nameEn: 'Estonia' },
  { code: 'LV', name: 'Lotyšsko', nameEn: 'Latvia' },
  { code: 'LT', name: 'Litva', nameEn: 'Lithuania' },
  { code: 'IS', name: 'Island', nameEn: 'Iceland' },
  { code: 'LU', name: 'Lucembursko', nameEn: 'Luxembourg' },
  { code: 'MT', name: 'Malta', nameEn: 'Malta' },
  { code: 'CY', name: 'Kypr', nameEn: 'Cyprus' },
  { code: 'SG', name: 'Singapur', nameEn: 'Singapore' },
  { code: 'MY', name: 'Malajsie', nameEn: 'Malaysia' },
  { code: 'TH', name: 'Thajsko', nameEn: 'Thailand' },
  { code: 'VN', name: 'Vietnam', nameEn: 'Vietnam' },
  { code: 'PH', name: 'Filipíny', nameEn: 'Philippines' },
  { code: 'ID', name: 'Indonésie', nameEn: 'Indonesia' },
  { code: 'ZA', name: 'Jihoafrická republika', nameEn: 'South Africa' },
  { code: 'EG', name: 'Egypt', nameEn: 'Egypt' },
  { code: 'IL', name: 'Izrael', nameEn: 'Israel' },
  { code: 'AE', name: 'Spojené arabské emiráty', nameEn: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudská Arábie', nameEn: 'Saudi Arabia' },
];

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code || c.code.toUpperCase() === code.toUpperCase());
}

/**
 * Get country name by code
 */
export function getCountryName(code: string): string {
  const country = getCountryByCode(code);
  return country ? country.name : code;
}

