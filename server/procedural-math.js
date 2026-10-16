import { getConfig } from './config.js';

export const LOS_SANTOS_ADDRESSES = [
  "Abattoir Avenue", "Abe Milton Parkway", "Ace Jones Drive", "Adam's Apple Boulevard",
  "Aguja Street", "Alta Place", "Alta Street", "Amarillo Vista", "Amarillo Way", "Americano Way",
  "Atlee Street", "Autopia Parkway", "Banham Canyon Drive", "Barbareno Road", "Bay City Avenue",
  "Bay City Incline", "Baytree Canyon Road", "Boulevard Del Perro", "Bridge Street", "Brouge Avenue",
  "Buccaneer Way", "Buen Vino Road", "Caesars Place", "Calais Avenue", "Capital Boulevard",
  "Carcer Way", "Carson Avenue", "Chum Street", "Chupacabra Street", "Clinton Avenue",
  "Cockingend Drive", "Conquistador Street", "Cortes Street", "Cougar Avenue", "Covenant Avenue",
  "Cox Way", "Crusade Road", "Davis Avenue", "Decker Street", "Didion Drive", "Dorset Drive",
  "Dorset Place", "Dry Dock Street", "Dunstable Drive", "Dunstable Lane",
  "Dutch London Street", "Eastbourne Way", "East Galileo Avenue", "East Mirror Drive",
  "Eclipse Boulevard", "Edwood Way", "Elgin Avenue", "El Burro Boulevard", "El Rancho Boulevard",
  "Equality Way", "Exceptionalists Way", "Fantastic Place", "Fenwell Place", "Forum Drive",
  "Fudge Lane", "Galileo Road", "Gentry Lane", "Ginger Street", "Glory Way", "Goma Street",
  "Greenwich Parkway", "Greenwich Place", "Greenwich Way", "Grove Street", "Hanger Way",
  "Hangman Avenue", "Hardy Way", "Hawick Avenue", "Heritage Way", "Hillcrest Avenue",
  "Hillcrest Ridge Access Road", "Imagination Court", "Industry Passage", "Ineseno Road",
  "Integrity Way", "Invention Court", "Innocence Boulevard", "Jamestown Street", "Kimble Hill Drive",
  "Kortz Drive", "Labor Place", "Laguna Place", "Lake Vinewood Drive",
  "Las Lagunas Boulevard", "Liberty Street", "Lindsay Circus", "Little Bighorn Avenue",
  "Low Power Street", "Macdonald Street", "Mad Wayne Thunder Drive", "Magellan Avenue",
  "Marathon Avenue", "Marlowe Drive", "Melanoma Street", "Meteor Street", "Milton Road",
  "Mirror Park Boulevard", "Mirror Place", "Morningwood Boulevard", "Mount Haan Drive",
  "Mount Haan Road", "Mount Vinewood Drive", "Movie Star Way", "Mutiny Road", "New Empire Way",
  "Nikola Avenue", "Nikola Place", "Normandy Drive", "North Archer Avenue", "North Conker Avenue",
  "North Sheldon Avenue", "North Rockford Drive", "Occupation Avenue", "Orchardville Avenue",
  "Palomino Avenue", "Peaceful Street", "Perth Street", "Picture Perfect Drive", "Plaice Place",
  "Playa Vista", "Popular Street", "Portola Drive", "Power Street", "Prosperity Street",
  "Prosperity Street Promenade", "Red Desert Avenue", "Richman Street", "Rockford Drive",
  "Roy Lowenstein Boulevard", "Rub Street", "San Andreas Avenue", "Sandcastle Way",
  "San Vitus Boulevard", "Senora Road", "Shank Street", "Signal Street", "Sinner Street",
  "Sinners Passage", "South Arsenal Street", "South Boulevard Del Perro", "South Mo Milton Drive",
  "South Rockford Drive", "South Shambles Street", "Spanish Avenue", "Steele Way",
  "Strangeways Drive", "Strawberry Avenue", "Supply Street", "Sustancia Road", "Swiss Street",
  "Tackle Street", "Tangerine Street", "Tongva Drive", "Tower Way", "Tug Street", "Utopia Gardens",
  "Vespucci Boulevard", "Vinewood Boulevard", "Vinewood Park Drive", "Vitus Street", "Voodoo Place",
  "West Eclipse Boulevard", "West Galileo Avenue", "West Mirror Drive", "Whispymound Drive",
  "Wild Oats Drive", "York Street", "Zancudo Barranca"
];

export const BLAINE_COUNTY_ADDRESSES = [
  "Algonquin Boulevard", "Alhambra Drive", "Armadillo Avenue", "Baytree Canyon Road", "Calafia Road",
  "Cascabel Avenue", "Cassidy Trail", "Cat-Claw Avenue", "Chianski Passage", "Cholla Road",
  "Cholla Springs Avenue", "Duluoz Avenue", "East Joshua Road",
  "Fort Zancudo Approach Road", "Galileo Road", "Grapeseed Avenue", "Grapeseed Main Street",
  "Joad Lane", "Joshua Road", "Lesbos Lane", "Lolita Avenue", "Marina Drive", "Meringue Lane",
  "Mount Haan Road", "Mountain View Drive", "Niland Avenue", "North Calafia Way", "Nowhere Road",
  "O'Neil Way", "Paleto Boulevard", "Panorama Drive", "Procopio Drive", "Procopio Promenade",
  "Pyrite Avenue", "Raton Pass", "Route 68 Approach", "Seaview Road", "Senora Way", "Smoke Tree Road",
  "Union Road", "Zancudo Avenue", "Zancudo Road", "Zancudo Trail"
];

export const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
  "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
  "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez",
  "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott",
  "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers"
];

export const MALE_FIRST_NAMES = [
  "Aaron", "Adam", "Adrian", "Aiden", "Alan", "Alex", "Alexander", "Andrew", "Anthony", "Austin",
  "Benjamin", "Blake", "Bradley", "Brandon", "Brayden", "Brian", "Bruce", "Bryan", "Caleb", "Cameron",
  "Carlos", "Carter", "Charles", "Chase", "Christian", "Christopher", "Cole", "Colin", "Connor", "Corey",
  "Daniel", "David", "Derek", "Devin", "Dominic", "Dustin", "Dylan", "Edward", "Eli", "Elijah",
  "Eric", "Ethan", "Evan", "Gabriel", "Gage", "Garrett", "Gavin", "George", "Grant", "Gregory",
  "Henry", "Hunter", "Ian", "Isaac", "Isaiah", "Jack", "Jackson", "Jacob", "Jaden", "James",
  "Jared", "Jason", "Jayden", "Jeffrey", "Jeremy", "Jesse", "Joel", "John", "Jonathan", "Jordan",
  "Jose", "Joseph", "Joshua", "Justin", "Kenneth", "Kevin", "Kyle", "Landon", "Leo", "Liam",
  "Logan", "Lucas", "Luke", "Marcus", "Mason", "Matthew", "Max", "Michael", "Nathan", "Nicholas",
  "Noah", "Nolan", "Oliver", "Owen", "Parker", "Patrick", "Paul", "Peter", "Philip", "Richard",
  "Riley", "Robert", "Ryan", "Samuel", "Sean", "Sebastian", "Seth", "Stephen", "Steven", "Thomas",
  "Timothy", "Travis", "Trevor", "Tyler", "Victor", "Vincent", "Wesley", "William", "Wyatt", "Zachary"
];

export const FEMALE_FIRST_NAMES = [
  "Abigail", "Addison", "Alexa", "Alexis", "Alice", "Allison", "Alyssa", "Amanda", "Amber", "Amy",
  "Andrea", "Angela", "Anna", "Ashley", "Audrey", "Autumn", "Ava", "Bailey", "Bella", "Bethany",
  "Brianna", "Brooke", "Brooklyn", "Caitlin", "Camila", "Carla", "Caroline", "Catherine", "Chloe", "Claire",
  "Courtney", "Daisy", "Danielle", "Destiny", "Diana", "Elena", "Elizabeth", "Ella", "Emily", "Emma",
  "Erica", "Erin", "Eva", "Evelyn", "Faith", "Gabriella", "Grace", "Hailey", "Haley", "Hannah",
  "Harper", "Heather", "Isabella", "Isabelle", "Jasmine", "Jenna", "Jennifer", "Jessica", "Jocelyn", "Jordan",
  "Julia", "Kaitlyn", "Katherine", "Kayla", "Kaylee", "Kelly", "Kendra", "Kennedy", "Kylie", "Lauren",
  "Layla", "Leah", "Lily", "Lucy", "Madeline", "Madelyn", "Madison", "Makayla", "Maria", "Maya",
  "Megan", "Melanie", "Mia", "Molly", "Morgan", "Natalie", "Nicole", "Olivia", "Paige", "Peyton",
  "Rachel", "Rebecca", "Riley", "Samantha", "Sarah", "Savannah", "Sierra", "Skylar", "Sophia", "Stephanie",
  "Sydney", "Taylor", "Trinity", "Vanessa", "Victoria", "Violet", "Vivian", "Zoey"
];

export const VEHICLE_MODELS = [
  { model: "adder", make: "Truffade", type: "Super" },
  { model: "asea", make: "Declasse", type: "Sedan" },
  { model: "asterope", make: "Karin", type: "Sedan" },
  { model: "banshee", make: "Bravado", type: "Sports" },
  { model: "blista", make: "Dinka", type: "Compact" },
  { model: "buffalo", make: "Bravado", type: "Sports" },
  { model: "cavalcade", make: "Albany", type: "SUV" },
  { model: "cheetah", make: "Grotti", type: "Super" },
  { model: "comet2", make: "Pfister", type: "Sports" },
  { model: "dominator", make: "Vapid", type: "Muscle" },
  { model: "dukes", make: "Imponte", type: "Muscle" },
  { model: "emperor", make: "Albany", type: "Sedan" },
  { model: "entityxf", make: "Overflod", type: "Super" },
  { model: "exemplar", make: "Dewbauchee", type: "Coupe" },
  { model: "f620", make: "Ocelot", type: "Coupe" },
  { model: "felon", make: "Lampadati", type: "Coupe" },
  { model: "fugitive", make: "Cheval", type: "Sedan" },
  { model: "fusilade", make: "Schyster", type: "Sports" },
  { model: "gauntlet", make: "Bravado", type: "Muscle" },
  { model: "granger", make: "Declasse", type: "SUV" },
  { model: "gresley", make: "Bravado", type: "SUV" },
  { model: "habanero", make: "Emperor", type: "SUV" },
  { model: "infernus", make: "Pegassi", type: "Super" },
  { model: "intruder", make: "Karin", type: "Sedan" },
  { model: "issi2", make: "Weeny", type: "Compact" },
  { model: "jackal", make: "Ocelot", type: "Coupe" },
  { model: "landstalker", make: "Dundreary", type: "SUV" },
  { model: "manana", make: "Albany", type: "Sports Classic" },
  { model: "mesa", make: "Canis", type: "Off-Road" },
  { model: "oracle", make: "Ubermacht", type: "Sedan" },
  { model: "patriot", make: "Mammoth", type: "SUV" },
  { model: "penumbra", make: "Maibatsu", type: "Sports" },
  { model: "picador", make: "Cheval", type: "Muscle" },
  { model: "premier", make: "Declasse", type: "Sedan" },
  { model: "pranger", make: "Declasse", type: "SUV" },
  { model: "radius", make: "Vapid", type: "SUV" },
  { model: "rancherxl", make: "Declasse", type: "Off-Road" },
  { model: "rapidgt", make: "Dewbauchee", type: "Sports" },
  { model: "rocoto", make: "Obey", type: "SUV" },
  { model: "ruiner", make: "Imponte", type: "Muscle" },
  { model: "sabre2", make: "Declasse", type: "Muscle" },
  { model: "sandking", make: "Vapid", type: "Off-Road" },
  { model: "schafter2", make: "Benefactor", type: "Sedan" },
  { model: "schwarzer", make: "Benefactor", type: "Sports" },
  { model: "seminole", make: "Canis", type: "SUV" },
  { model: "sentinel", make: "Ubermacht", type: "Coupe" },
  { model: "serrano", make: "Benefactor", type: "SUV" },
  { model: "stanier", make: "Vapid", type: "Sedan" },
  { model: "stratum", make: "Zirconium", type: "Sedan" },
  { model: "sultan", make: "Karin", type: "Sports" },
  { model: "superd", make: "Enus", type: "Sedan" },
  { model: "surano", make: "Benefactor", type: "Sports" },
  { model: "tailgater", make: "Obey", type: "Sedan" },
  { model: "tornado", make: "Declasse", type: "Sports Classic" },
  { model: "vacca", make: "Pegassi", type: "Super" },
  { model: "vigero", make: "Declasse", type: "Muscle" },
  { model: "voltic", make: "Coil", type: "Super" },
  { model: "washington", make: "Albany", type: "Sedan" },
  { model: "zion", make: "Ubermacht", type: "Coupe" }
];

export const VEHICLE_COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "Graphite", hex: "#3b3b3b" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "White", hex: "#f0f0f0" },
  { name: "Red", hex: "#b22222" },
  { name: "Torino Red", hex: "#d91414" },
  { name: "Dark Blue", hex: "#002060" },
  { name: "Midnight Blue", hex: "#191970" },
  { name: "Diamond Blue", hex: "#4682b4" },
  { name: "Racing Green", hex: "#006400" },
  { name: "Olive Green", hex: "#556b2f" },
  { name: "Yellow", hex: "#ffd700" },
  { name: "Orange", hex: "#ff8c00" },
  { name: "Matte Gray", hex: "#4a4a4a" },
  { name: "Brown", hex: "#8b4513" },
  { name: "Wine Red", hex: "#58111a" }
];

export const CAUTION_FLAGS = [
  { name: "Active Restraining Order", weight: 0.20 },
  { name: "Gang Affiliation", weight: 0.10 },
  { name: "Domestic Violence History", weight: 0.50 },
  { name: "Sex Offender", weight: 0.10 },
  { name: "Under Investigation", weight: 0.30 },
  { name: "High Risk", weight: 0.40 },
  { name: "Mental Health Flag", weight: 0.30 },
  { name: "Drug-related", weight: 0.60 },
  { name: "No Contact", weight: 0.20 },
  { name: "Flight Risk", weight: 0.30 },
  { name: "Violent", weight: 0.50 },
  { name: "Argumentative", weight: 0.65 }
];

export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPlate() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let plate = "";
  plate += numbers[getRandomInt(0, 9)];
  plate += numbers[getRandomInt(0, 9)];
  plate += letters[getRandomInt(0, 25)];
  plate += letters[getRandomInt(0, 25)];
  plate += letters[getRandomInt(0, 25)];
  plate += numbers[getRandomInt(0, 9)];
  plate += numbers[getRandomInt(0, 9)];
  plate += numbers[getRandomInt(0, 9)];
  return plate;
}

export function generateVin() {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let vin = "";
  for (let i = 0; i < 17; i++) {
    vin += chars[getRandomInt(0, chars.length - 1)];
  }
  return vin;
}

export function generateLicenseNumber() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let lic = letters[getRandomInt(0, 25)];
  for (let i = 0; i < 7; i++) {
    lic += numbers[getRandomInt(0, 9)];
  }
  return lic;
}

export function getRandomAddress() {
  const isLS = Math.random() < 0.65;
  const list = isLS ? LOS_SANTOS_ADDRESSES : BLAINE_COUNTY_ADDRESSES;
  const street = getRandomElement(list);
  const number = String(getRandomInt(10, 999)).padStart(3, '0');
  const area = isLS ? "Los Santos" : "Blaine County";
  return { full: `${number} ${street}`, street, number, area, county: isLS ? "Los Santos County" : "Blaine County" };
}

export function generateBirthday(minAge = 18, maxAge = 75) {
  const now = new Date();
  const age = getRandomInt(minAge, maxAge);
  const birthYear = now.getFullYear() - age;
  const birthMonth = getRandomInt(1, 12);
  const birthDay = getRandomInt(1, 28);
  const mStr = String(birthMonth).padStart(2, '0');
  const dStr = String(birthDay).padStart(2, '0');
  return { date: `${mStr}/${dStr}/${birthYear}`, age };
}

export function generateLicenseExpiration(isValid = true) {
  const now = new Date();
  const yearOffset = isValid ? getRandomInt(1, 4) : -getRandomInt(1, 3);
  const expYear = now.getFullYear() + yearOffset;
  const expMonth = getRandomInt(1, 12);
  const expDay = getRandomInt(1, 28);
  return `${String(expMonth).padStart(2, '0')}/${String(expDay).padStart(2, '0')}/${expYear}`;
}

export function generateHeightAndWeight(gender = "male") {
  const isFemale = gender.toLowerCase() === "female";
  const totalInches = isFemale ? 62 + getRandomInt(0, 6) : 67 + getRandomInt(0, 8);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const height = `${feet}' ${inches}"`;
  
  const inchesOver5Ft = Math.max(0, totalInches - 60);
  const baseWeightKg = isFemale ? 45.5 + (2.3 * inchesOver5Ft) : 50.0 + (2.3 * inchesOver5Ft);
  const variance = (Math.random() * 0.30) - 0.15;
  const finalWeightLbs = Math.round(baseWeightKg * (1 + variance) * 2.20462);
  return { height, weight: `${finalWeightLbs} lbs` };
}

export function assignCautionFlags(priorsCount) {
  if (priorsCount <= 0) return [];
  const assigned = [];
  const numFlags = Math.min(3, Math.floor(priorsCount / 2) + (Math.random() < 0.4 ? 1 : 0));
  const pool = [...CAUTION_FLAGS];
  
  for (let i = 0; i < numFlags && pool.length > 0; i++) {
    const idx = getRandomInt(0, pool.length - 1);
    const flag = pool.splice(idx, 1)[0];
    assigned.push(flag.name);
  }
  return assigned;
}

export function generateProceduralPed(queryName = null) {
  const gender = Math.random() < 0.5 ? "Male" : "Female";
  let firstName = "";
  let lastName = "";
  
  if (queryName && queryName.trim().length > 0) {
    const parts = queryName.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : getRandomElement(LAST_NAMES);
  } else {
    firstName = gender === "Male" ? getRandomElement(MALE_FIRST_NAMES) : getRandomElement(FEMALE_FIRST_NAMES);
    lastName = getRandomElement(LAST_NAMES);
  }
  
  const fullName = `${firstName} ${lastName}`;
  const { date: birthday, age } = generateBirthday(18, 70);
  const { height, weight } = generateHeightAndWeight(gender);
  const address = getRandomAddress();
  
  // License Status
  const licRoll = Math.random() * 100;
  let licenseStatus = "Valid";
  if (licRoll < 15) licenseStatus = "Expired";
  else if (licRoll < 25) licenseStatus = "Suspended";
  else if (licRoll < 28) licenseStatus = "Revoked";
  
  const licenseNumber = generateLicenseNumber();
  const licenseExpiration = generateLicenseExpiration(licenseStatus === "Valid");
  
  // Gun permit
  const gunPermitRoll = Math.random() * 100;
  let gunPermitStatus = "None";
  let gunPermitClass = "None";
  if (gunPermitRoll < 35) {
    gunPermitStatus = "Valid";
    const classes = [];
    if (Math.random() < 0.8) classes.push("Handguns");
    if (Math.random() < 0.35) classes.push("Shotguns");
    if (Math.random() < 0.25) classes.push("Longguns");
    gunPermitClass = classes.length > 0 ? classes.join(" / ") : "Handguns";
  } else if (gunPermitRoll < 40) {
    gunPermitStatus = "Suspended";
    gunPermitClass = "Handguns";
  }
  
  // Criminal Record count
  const criminalRoll = Math.random() * 100;
  let arrestCount = 0;
  if (criminalRoll > 60 && criminalRoll <= 85) arrestCount = getRandomInt(1, 2);
  else if (criminalRoll > 85 && criminalRoll <= 95) arrestCount = getRandomInt(2, 4);
  else if (criminalRoll > 95) arrestCount = getRandomInt(4, 7);
  
  const citationRoll = Math.random() * 100;
  let citationCount = 0;
  if (citationRoll > 50 && citationRoll <= 80) citationCount = getRandomInt(1, 2);
  else if (citationRoll > 80 && citationRoll <= 93) citationCount = getRandomInt(2, 4);
  else if (citationRoll > 93) citationCount = getRandomInt(4, 6);
  
  const flags = assignCautionFlags(arrestCount);
  const activeWarrant = arrestCount > 0 && Math.random() < 0.15;
  
  return {
    name: fullName,
    firstName,
    lastName,
    gender,
    birthday,
    age,
    height,
    weight,
    address: address.full,
    street: address.street,
    area: address.area,
    licenseNumber,
    licenseStatus,
    licenseExpiration,
    gunPermitStatus,
    gunPermitClass,
    fishingPermit: Math.random() < 0.4 ? "Valid" : "None",
    huntingPermit: Math.random() < 0.25 ? "Valid" : "None",
    arrestCount,
    citationCount,
    flags,
    activeWarrant,
    warrantDetails: activeWarrant ? "FTA - Outstanding Court Warrant" : null,
    totalStops: citationCount + arrestCount + (Math.random() < 0.3 ? 1 : 0),
    isProcedural: true
  };
}

export function generateProceduralVehicle(queryPlate = null, ownerName = null) {
  const plate = queryPlate && queryPlate.trim().length > 0 ? queryPlate.trim().toUpperCase() : generateRandomPlate();
  const vehModel = getRandomElement(VEHICLE_MODELS);
  const color = getRandomElement(VEHICLE_COLORS);
  const vin = generateVin();
  
  const regRoll = Math.random() * 100;
  let registration = "Valid";
  if (regRoll < 12) registration = "Expired";
  else if (regRoll < 18) registration = "Suspended";
  else if (regRoll < 22) registration = "None";
  
  const insRoll = Math.random() * 100;
  let insurance = "Valid";
  if (insRoll < 15) insurance = "Expired";
  else if (insRoll < 25) insurance = "None";
  
  const stolen = Math.random() < 0.08 ? "Yes" : "No";
  const police = Math.random() < 0.04 ? "Yes" : "No";
  
  let owner = ownerName;
  if (!owner) {
    const ownerGender = Math.random() < 0.5 ? "Male" : "Female";
    const fName = ownerGender === "Male" ? getRandomElement(MALE_FIRST_NAMES) : getRandomElement(FEMALE_FIRST_NAMES);
    const lName = getRandomElement(LAST_NAMES);
    owner = `${fName} ${lName}`;
  }
  
  return {
    plateNumber: plate,
    model: vehModel.model,
    make: vehModel.make,
    type: vehModel.type,
    color: color.name,
    colorHex: color.hex,
    vin,
    registration,
    registrationExpiration: generateLicenseExpiration(registration === "Valid"),
    insurance,
    stolenStatus: stolen,
    policeStatus: police,
    owner,
    inspection: Math.random() < 0.85 ? "Valid" : "Expired",
    isProcedural: true
  };
}
