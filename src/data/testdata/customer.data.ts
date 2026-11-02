import type { CustomerData } from '@pages/commercial/CustomerFormPage';
import { uniqueCode, uniqueEmail, uniqueGstin, uniqueMobile, uniqueName } from '@utils/unique';

/**
 * Master values the create test picks in the Customer form. They must exist in
 * the environment's master data (Admin › Geography); override per environment
 * with CUSTOMER_COUNTRY / CUSTOMER_STATE / CUSTOMER_CITY in .env.<name>.
 */
const LOCATION = {
  country: process.env.CUSTOMER_COUNTRY || 'India',
  state: process.env.CUSTOMER_STATE || 'Telangana',
  city: process.env.CUSTOMER_CITY || 'Hyderabad',
  /** GSTIN state code that goes with the state above */
  gstState: process.env.CUSTOMER_GST_STATE || '36',
};

/** A customer whose name, code, GSTIN, mobile and e-mail are new on every run. */
export function buildCustomer(overrides: Partial<CustomerData> = {}): CustomerData {
  return {
    name: uniqueName('Customer'),
    code: uniqueCode('PW', 10),
    gstin: uniqueGstin(LOCATION.gstState),
    mobile: uniqueMobile(),
    email: uniqueEmail(),
    country: LOCATION.country,
    state: LOCATION.state,
    city: LOCATION.city,
    contactPerson: 'Playwright Automation',
    address1: 'Automation test record — safe to delete',
    zip: '500001',
    remarks: 'Created by the CFS Playwright suite',
    ...overrides,
  };
}
