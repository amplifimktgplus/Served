/* Shared fixture data for the Served. static build.
   The first three venues are the ones in the approved homepage design.
   The remaining three are placeholder inventory so the listing filters have
   something to act on — flagged as invented in README.md. */

window.SERVED = window.SERVED || {}

SERVED.venues = [
  {
    slug: 'vantage-pickleball-marikina',
    name: 'Vantage Pickleball Marikina',
    sport: 'Pickleball',
    surface: 'Hard',
    location: '1 FVR Rd, Marikina',
    city: 'Marikina',
    img: 'assets/img/venue-pickleball.jpg',
    price: 700,
    rating: 4.2,
    reviews: 300,
    badge: 'Featured',
    next: '30 August 2026',
    courts: 4,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Parking', 'Showers'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    slug: 'rally-x',
    name: 'Rally X',
    sport: 'Tennis',
    surface: 'Clay',
    location: 'UP Diliman, QC',
    city: 'Quezon City',
    img: 'assets/img/venue-tennis.jpg',
    price: 700,
    rating: 5.0,
    reviews: 150,
    badge: 'Top Rated',
    next: '24 August 2026',
    courts: 3,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Parking'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    slug: 'pico-de-loro-badminton',
    name: 'Pico De Loro Badminton Court',
    sport: 'Badminton',
    surface: 'Wood',
    location: 'Nasugbu, Batangas',
    city: 'Batangas',
    img: 'assets/img/venue-badminton.jpg',
    price: 700,
    rating: 4.7,
    reviews: 120,
    badge: null,
    next: '26 August 2026',
    courts: 4,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Air-conditioned'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    slug: 'bgc-turf-pickleball',
    name: 'BGC Turf Pickleball Hub',
    sport: 'Pickleball',
    surface: 'Acrylic',
    location: '5th Ave, Taguig',
    city: 'Taguig',
    img: 'assets/img/venue-pickleball.jpg',
    price: 850,
    rating: 4.5,
    reviews: 210,
    badge: 'Featured',
    next: '22 August 2026',
    courts: 6,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Parking', 'Café'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    slug: 'alabang-tennis-club',
    name: 'Alabang Tennis Club',
    sport: 'Tennis',
    surface: 'Hard',
    location: 'Alabang, Muntinlupa',
    city: 'Muntinlupa',
    img: 'assets/img/venue-tennis.jpg',
    price: 950,
    rating: 4.8,
    reviews: 96,
    badge: 'Top Rated',
    next: '28 August 2026',
    courts: 5,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Showers', 'Parking'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
  {
    slug: 'ortigas-smash-badminton',
    name: 'Ortigas Smash Badminton',
    sport: 'Badminton',
    surface: 'Wood',
    location: 'Ortigas Center, Pasig',
    city: 'Pasig',
    img: 'assets/img/venue-badminton.jpg',
    price: 600,
    rating: 4.3,
    reviews: 178,
    badge: null,
    next: '21 August 2026',
    courts: 8,
    size: 'Standard',
    amenities: ['Lights', 'Net', 'Air-conditioned', 'Parking'],
    blurb: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  },
]

SERVED.bySlug = (s) => SERVED.venues.find((v) => v.slug === s)

/* August 2026 availability. 1 Aug 2026 is a Saturday.
   Days listed here have open slots; everything else reads as full. */
SERVED.availableDays = [3, 5, 6, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24, 26, 27, 29, 30, 31]

SERVED.slots = [
  '8:00 - 9:00', '9:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
  '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
  '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00',
]

/* Slots already taken, keyed "<day>|<court>" — makes the picker feel real. */
SERVED.taken = {
  '15|Court A': ['8:00 - 9:00', '12:00 - 13:00', '17:00 - 18:00'],
  '15|Court B': ['9:00 - 10:00', '10:00 - 11:00'],
  '15|Court C': ['18:00 - 19:00'],
  '15|Court D': ['8:00 - 9:00', '9:00 - 10:00', '19:00 - 20:00'],
}

SERVED.peso = (n) => '₱' + n.toLocaleString('en-PH')

/* Booking draft is carried between funnel pages in sessionStorage. */
SERVED.draft = {
  get() {
    try { return JSON.parse(sessionStorage.getItem('served.draft') || '{}') } catch { return {} }
  },
  set(patch) {
    const next = Object.assign(SERVED.draft.get(), patch)
    sessionStorage.setItem('served.draft', JSON.stringify(next))
    return next
  },
  clear() { sessionStorage.removeItem('served.draft') },
}
