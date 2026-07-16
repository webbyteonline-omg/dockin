export type LocationCategory =
  | "gate"
  | "academic"
  | "hostel"
  | "food"
  | "sports"
  | "hangout"
  | "misc";

export interface CampusLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: LocationCategory;
  icon: string;
}

export const CATEGORY_COLORS: Record<LocationCategory, string> = {
  gate: "#FF5C5C",
  academic: "#6C63FF",
  hostel: "#43D98C",
  food: "#FFB347",
  sports: "#FF6584",
  hangout: "#64B5F6",
  misc: "#888888",
};

export const CATEGORY_LABELS: Record<LocationCategory, string> = {
  gate: "Gates",
  academic: "Academic",
  hostel: "Hostel",
  food: "Food",
  sports: "Sports",
  hangout: "Hangout",
  misc: "Misc",
};

export const CAMPUS_CENTER: [number, number] = [28.4496, 77.5856];

/** Rough campus bounding box for "you're on campus" detection. */
export const CAMPUS_BOUNDS = {
  minLat: 28.4465,
  maxLat: 28.4535,
  minLng: 77.5805,
  maxLng: 77.589,
};

export function isOnCampus(lat: number, lng: number): boolean {
  return (
    lat >= CAMPUS_BOUNDS.minLat &&
    lat <= CAMPUS_BOUNDS.maxLat &&
    lng >= CAMPUS_BOUNDS.minLng &&
    lng <= CAMPUS_BOUNDS.maxLng
  );
}

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  // Gates
  { id: "main-gate", name: "Main Gate", lat: 28.44859313281385, lng: 77.58176220763055, category: "gate", icon: "🚪" },
  { id: "gate-2", name: "Gate 2", lat: 28.449436, lng: 77.581226, category: "gate", icon: "🚪" },
  { id: "gate-3", name: "Gate 3", lat: 28.451644016786812, lng: 77.58700341483033, category: "gate", icon: "🚪" },
  // Academic
  { id: "a-block", name: "A Block", lat: 28.45027973242179, lng: 77.58418919450871, category: "academic", icon: "🏛️" },
  { id: "b-block", name: "B Block", lat: 28.449793372309962, lng: 77.58440802867612, category: "academic", icon: "🏛️" },
  { id: "n-block", name: "N Block", lat: 28.44892094250882, lng: 77.5835529067413, category: "academic", icon: "🏛️" },
  { id: "p-block", name: "P Block", lat: 28.449710349161965, lng: 77.58282321006685, category: "academic", icon: "🏛️" },
  { id: "lrc", name: "LRC (Library)", lat: 28.449293, lng: 77.584133, category: "academic", icon: "📚" },
  { id: "h-block", name: "H Block (Faculty)", lat: 28.450714554803604, lng: 77.58730242765311, category: "academic", icon: "🏢" },
  { id: "n1-prof", name: "N1 Professor Room", lat: 28.44878147746848, lng: 77.58383037693153, category: "academic", icon: "🏢" },
  { id: "n2-prof", name: "N2 Professor Room", lat: 28.448315276025166, lng: 77.58311417531417, category: "academic", icon: "🏢" },
  // Hostels
  { id: "c1", name: "C1 Hostel", lat: 28.450470295600994, lng: 77.58446468084628, category: "hostel", icon: "🏠" },
  { id: "c11", name: "C11 Badminton Court", lat: 28.451254844385012, lng: 77.58580971807038, category: "hostel", icon: "🏠" },
  { id: "c12", name: "C12", lat: 28.451627456288588, lng: 77.58636536390384, category: "hostel", icon: "🏠" },
  { id: "d4", name: "D4", lat: 28.449820365709986, lng: 77.58547537969683, category: "hostel", icon: "🏠" },
  { id: "d5", name: "D5", lat: 28.449841065308817, lng: 77.58575789267422, category: "hostel", icon: "🏠" },
  { id: "d6", name: "D6", lat: 28.450333714565073, lng: 77.58574376702535, category: "hostel", icon: "🏠" },
  // Food
  { id: "paid-mess", name: "Paid Mess", lat: 28.44936403683959, lng: 77.58387769802275, category: "food", icon: "🍽️" },
  { id: "mess", name: "Mess", lat: 28.450673185826147, lng: 77.586285250232, category: "food", icon: "🍽️" },
  { id: "dominos", name: "Dominos Pizza", lat: 28.448742835452506, lng: 77.5831557056622, category: "food", icon: "🍕" },
  { id: "snapeats", name: "SnapEats", lat: 28.449376939156668, lng: 77.58438347236775, category: "food", icon: "🥗" },
  { id: "house-of-chow", name: "House of Chow", lat: 28.449151018135, lng: 77.58451677753777, category: "food", icon: "🍜" },
  { id: "truck-food", name: "Truck Food Place", lat: 28.45153737925411, lng: 77.58375641124736, category: "food", icon: "🚚" },
  { id: "maggie-point", name: "Maggie Point (HotSpot)", lat: 28.45059606301239, lng: 77.58503287893875, category: "food", icon: "🍜" },
  { id: "southern-stories", name: "Southern Stories", lat: 28.450417892468764, lng: 77.58519380217473, category: "food", icon: "🍛" },
  { id: "tuck-shop", name: "Tuck Shop", lat: 28.451370768226734, lng: 77.58529645201143, category: "food", icon: "🛒" },
  { id: "quench", name: "Quench", lat: 28.450472355123505, lng: 77.5867656172932, category: "food", icon: "🧃" },
  // Hangout / Misc
  { id: "bennett-circle", name: "Bennett Circle", lat: 28.451096312469698, lng: 77.58395074575623, category: "hangout", icon: "⭕" },
  { id: "german-hanger-1", name: "German Hanger", lat: 28.44943538796283, lng: 77.58328389414243, category: "hangout", icon: "🏗️" },
  { id: "german-hanger-2", name: "German Hanger 2", lat: 28.44901555335485, lng: 77.58262145061768, category: "hangout", icon: "🏗️" },
  { id: "lost-found", name: "Lost And Found", lat: 28.45075676559816, lng: 77.58469315210723, category: "misc", icon: "🔍" },
  // Sports
  { id: "football-ground", name: "Football Ground", lat: 28.44954366514208, lng: 77.58647396437209, category: "sports", icon: "⚽" },
  { id: "k-block-sports", name: "K Block (Sports Complex)", lat: 28.45028282781318, lng: 77.58705850624895, category: "sports", icon: "🏋️" },
  { id: "swimming-pool", name: "Swimming Pool", lat: 28.45013268581377, lng: 77.58754452983194, category: "sports", icon: "🏊" },
  { id: "basketball", name: "Basketball Court", lat: 28.450056115499788, lng: 77.58694815704763, category: "sports", icon: "🏀" },
  { id: "tennis", name: "Tennis Court", lat: 28.449617618986473, lng: 77.58735192035886, category: "sports", icon: "🎾" },
  { id: "volleyball", name: "Volleyball Court", lat: 28.45116583134904, lng: 77.58683389579195, category: "sports", icon: "🏐" },
  { id: "pickleball-1", name: "Pickleball Court", lat: 28.45103334669138, lng: 77.5866596678637, category: "sports", icon: "🏓" },
  { id: "pickleball-2", name: "Pickleball Court 2", lat: 28.44948233806052, lng: 77.58706823777429, category: "sports", icon: "🏓" },
  { id: "badminton", name: "Badminton Court (C11)", lat: 28.451254844385012, lng: 77.58580971807038, category: "sports", icon: "🏸" },
];
