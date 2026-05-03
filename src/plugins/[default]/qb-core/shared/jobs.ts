// Direct port of qb-core/shared/jobs.lua. Same shape, same keys.
// Drop-in for `QBCore.Shared.Jobs` consumers (qb-policejob, qb-ambulancejob,
// qb-management, qb-houses, qb-cityhall, etc.).

export interface JobGrade {
  name: string;
  payment: number;
  isboss?: boolean;
}

export interface Job {
  label: string;
  /** Free-form tag used by some plugins to group jobs (e.g. 'leo' for
   *  law enforcement, 'ems' for medical, 'mechanic' for shops). */
  type?: string;
  /** When true, players default to on-duty after login. The
   *  `ForceJobDefaultDutyAtLogin` global toggles whether this default
   *  is applied or whether the last-saved duty state is restored. */
  defaultDuty: boolean;
  offDutyPay: boolean;
  grades: Record<string, JobGrade>;
}

/** When true, force every player's duty state to `Job.defaultDuty` on
 *  login. When false, restore the last-saved duty state from the DB.
 *  Mirrors `QBShared.ForceJobDefaultDutyAtLogin`. */
export const ForceJobDefaultDutyAtLogin = true;

export const Jobs: Record<string, Job> = {
  unemployed: {
    label: 'Civilian',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Freelancer', payment: 10 } },
  },
  bus: {
    label: 'Bus',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Driver', payment: 50 } },
  },
  judge: {
    label: 'Honorary',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Judge', payment: 100 } },
  },
  lawyer: {
    label: 'Law Firm',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Associate', payment: 50 } },
  },
  reporter: {
    label: 'Reporter',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Journalist', payment: 50 } },
  },
  trucker: {
    label: 'Trucker',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Driver', payment: 50 } },
  },
  tow: {
    label: 'Towing',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Driver', payment: 50 } },
  },
  garbage: {
    label: 'Garbage',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Collector', payment: 50 } },
  },
  vineyard: {
    label: 'Vineyard',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Picker', payment: 50 } },
  },
  hotdog: {
    label: 'Hotdog',
    defaultDuty: true,
    offDutyPay: false,
    grades: { '0': { name: 'Sales', payment: 50 } },
  },
  police: {
    label: 'Law Enforcement',
    type: 'leo',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Officer', payment: 75 },
      '2': { name: 'Sergeant', payment: 100 },
      '3': { name: 'Lieutenant', payment: 125 },
      '4': { name: 'Chief', isboss: true, payment: 150 },
    },
  },
  ambulance: {
    label: 'EMS',
    type: 'ems',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Paramedic', payment: 75 },
      '2': { name: 'Doctor', payment: 100 },
      '3': { name: 'Surgeon', payment: 125 },
      '4': { name: 'Chief', isboss: true, payment: 150 },
    },
  },
  realestate: {
    label: 'Real Estate',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'House Sales', payment: 75 },
      '2': { name: 'Business Sales', payment: 100 },
      '3': { name: 'Broker', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  taxi: {
    label: 'Taxi',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Driver', payment: 75 },
      '2': { name: 'Event Driver', payment: 100 },
      '3': { name: 'Sales', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  cardealer: {
    label: 'Vehicle Dealer',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Showroom Sales', payment: 75 },
      '2': { name: 'Business Sales', payment: 100 },
      '3': { name: 'Finance', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  mechanic: {
    label: 'LS Customs',
    type: 'mechanic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Novice', payment: 75 },
      '2': { name: 'Experienced', payment: 100 },
      '3': { name: 'Advanced', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  mechanic2: {
    label: 'LS Customs',
    type: 'mechanic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Novice', payment: 75 },
      '2': { name: 'Experienced', payment: 100 },
      '3': { name: 'Advanced', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  mechanic3: {
    label: 'LS Customs',
    type: 'mechanic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Novice', payment: 75 },
      '2': { name: 'Experienced', payment: 100 },
      '3': { name: 'Advanced', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  beeker: {
    label: "Beeker's Garage",
    type: 'mechanic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Novice', payment: 75 },
      '2': { name: 'Experienced', payment: 100 },
      '3': { name: 'Advanced', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
  bennys: {
    label: "Benny's Original Motor Works",
    type: 'mechanic',
    defaultDuty: true,
    offDutyPay: false,
    grades: {
      '0': { name: 'Recruit', payment: 50 },
      '1': { name: 'Novice', payment: 75 },
      '2': { name: 'Experienced', payment: 100 },
      '3': { name: 'Advanced', payment: 125 },
      '4': { name: 'Manager', isboss: true, payment: 150 },
    },
  },
};
