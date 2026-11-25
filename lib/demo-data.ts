import type { SourceDocument } from "./types";

export const sampleDocuments: SourceDocument[] = [
  {
    id: "northstar-spa",
    name: "Northstar_SPA_Executed.pdf",
    type: "PDF",
    pages: 42,
    category: "Acquisition",
    demo: true,
    content: `PAGE 12 | 7.3 Change of Control. Neither party may assign this Agreement without the prior written consent of the other party, except that either party may assign this Agreement to an affiliate or in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets. The assigning party shall provide written notice within ten (10) business days of such event.
PAGE 28 | 12.2 Termination for Convenience. Either party may terminate this Agreement for any reason upon ninety (90) days' prior written notice to the other party.
PAGE 29 | 12.4 Termination for Cause. Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days after receiving written notice.
PAGE 36 | 15.1 Governing Law. This Agreement is governed by the laws of the State of Delaware, without regard to conflict of law principles.
PAGE 8 | 4.1 Purchase Price. The aggregate purchase price is $24,500,000, subject to the adjustments set forth in Section 4.`,
  },
  {
    id: "meridian-lease",
    name: "Meridian_Office_Lease.pdf",
    type: "PDF",
    pages: 31,
    category: "Real estate",
    demo: true,
    content: `PAGE 3 | 1.2 Premises. Landlord leases to Tenant approximately 18,400 rentable square feet at 81 Market Street, San Francisco, California.
PAGE 9 | 5.1 Lease Term. The initial term is seven (7) years, commencing on January 1, 2025 and expiring on December 31, 2031.
PAGE 14 | 8.3 Assignment and Change of Control. Tenant shall not assign this Lease or undergo a change of control without Landlord's prior written consent, not to be unreasonably withheld. A transfer to an affiliate requires notice but not consent.
PAGE 20 | 11.2 Tenant Termination Option. Tenant may terminate on the fifth anniversary by giving at least twelve (12) months' prior written notice and paying the termination fee described in Exhibit D.
PAGE 25 | 14.1 Governing Law. This Lease shall be governed by the laws of the State of California.`,
  },
  {
    id: "atlas-nda",
    name: "Atlas_Mutual_NDA.docx",
    type: "DOCX",
    pages: 9,
    category: "Confidentiality",
    demo: true,
    content: `PAGE 2 | 2.1 Confidentiality. Each party shall protect Confidential Information using at least the same degree of care it uses for its own similar information, and no less than reasonable care.
PAGE 4 | 4.2 Term. This Agreement remains in effect for three (3) years from the Effective Date. Confidentiality obligations survive for five (5) years following disclosure; trade secrets remain protected for so long as they qualify as trade secrets under applicable law.
PAGE 6 | 6.1 Termination. Either party may terminate this Agreement upon thirty (30) days' written notice. Termination does not relieve either party of its obligations with respect to Confidential Information disclosed before termination.
PAGE 8 | 9.1 Governing Law. This Agreement is governed by the laws of the State of New York.`,
  },
];
