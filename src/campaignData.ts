export const campaignName = 'Akpanudoedehe for Akwa Ibom'
export const candidateName = 'Senator John James Akpanudoedehe'

export const lgas = [
  'Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo',
  'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono-Ibom', 'Ika', 'Ikono',
  'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat-Enin',
  'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Ubium', 'Obot Akara', 'Okobo', 'Onna',
  'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uruan', 'Urue-Offong/Oruko',
  'Uyo',
]

export const sampleSupporters = [
  { id: '001', name: 'Supporter One', phone: '+234 803 *** 1284', lga: 'Uyo', ward: 'Ward 3', group: 'Uyo Support Network', status: 'Verified', date: 'Nov 24, 2026' },
  { id: '002', name: 'Supporter Two', phone: '+234 806 *** 9451', lga: 'Eket', ward: 'Ward 1', group: 'Eket Support Network', status: 'Pending', date: 'Nov 23, 2026' },
  { id: '003', name: 'Supporter Three', phone: '+234 809 *** 6210', lga: 'Ikot Ekpene', ward: 'Ward 5', group: 'Community Volunteers', status: 'Not verified', date: 'Nov 22, 2026' },
  { id: '004', name: 'Supporter Four', phone: '+234 802 *** 7713', lga: 'Oron', ward: 'Ward 2', group: 'Oron Support Network', status: 'Verified', date: 'Nov 21, 2026' },
  { id: '005', name: 'Supporter Five', phone: '+234 805 *** 4052', lga: 'Abak', ward: 'Ward 4', group: 'Community Volunteers', status: 'Verified', date: 'Nov 20, 2026' },
  { id: '006', name: 'Supporter Six', phone: '+234 807 *** 3221', lga: 'Uyo', ward: 'Ward 3', group: 'Uyo Support Network', status: 'Pending', date: 'Nov 19, 2026' },
]

export const sampleEvents = [
  { day: '03', month: 'DEC', title: 'Community listening visit', location: 'Uyo, Akwa Ibom', time: '10:00 AM' },
  { day: '10', month: 'DEC', title: 'Youth engagement forum', location: 'Eket, Akwa Ibom', time: '11:30 AM' },
  { day: '17', month: 'DEC', title: 'Town hall meeting', location: 'Ikot Ekpene, Akwa Ibom', time: '2:00 PM' },
]

export const sampleNews = [
  { category: 'News', date: 'November 24, 2026', title: 'Listening to communities across Akwa Ibom', summary: 'A campaign built around hearing directly from residents and understanding the priorities that matter in every community.' },
  { category: 'Press release', date: 'November 18, 2026', title: 'Campaign announces statewide engagement programme', summary: 'The programme will bring community conversations to local government areas across the state.' },
  { category: 'Speech', date: 'November 12, 2026', title: 'A shared vision for a stronger Akwa Ibom', summary: 'Read the latest remarks on opportunity, service and the future of our state.' },
]

export const supportGroups = [
  'Uyo Support Network',
  'Eket Support Network',
  'Ikot Ekpene Support Network',
  'Oron Support Network',
  'Community Volunteers',
]

export const wards = Array.from({ length: 10 }, (_, index) => `Ward ${index + 1}`)
