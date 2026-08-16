import React from 'react';
import { LegalPage, LegalSection } from '../components/legal-page';

const SECTIONS: LegalSection[] = [
  {
    title: 'Who we are',
    body: 'Bink is an online marketplace that connects customers with independent beauty businesses - salons, studios and freelance professionals ("Providers"). Bink facilitates discovery, booking, messaging and payment; the beauty services themselves are performed by the Providers, not by Bink.',
  },
  {
    title: 'Accounts',
    body: 'You can browse as a guest, but booking history, messaging, invoices and business tools require an account. You are responsible for keeping your credentials safe and for all activity under your account. Provider team members receive individual sign-ins with the access level their manager assigns.',
  },
  {
    title: 'Bookings',
    body: 'A booking is a request for a specific service, time and professional at a Provider. The Provider may complete, reschedule or mark the appointment as a no-show. Availability shown on Bink reflects the Provider’s calendar at the time of booking.',
  },
  {
    title: 'Cancellations, fees and deposits',
    body: 'Each Provider sets its own cancellation policy, which is shown before you confirm a cancellation. Providers may charge a cancellation fee (a percentage of what you paid) and may require a reservation deposit to secure pay-at-venue bookings. Deposits are charged when you reserve and are held under the same protection as online payments.',
  },
  {
    title: 'Payments and escrow',
    body: 'Online payments (card or Apple Pay) are processed by our licensed payment partner; Bink does not store your card details. Amounts you pay online are held securely by Bink and released to the Provider only after the Provider marks your visit completed and you confirm it. Prices include 15% VAT and a tax invoice is issued automatically for every online payment.',
  },
  {
    title: 'Refunds',
    body: 'If a paid booking is cancelled or refunded before the escrow is released, the amount is returned to your original payment method, less any applicable cancellation fee under the Provider’s policy. Refunds are initiated by the Provider or by Bink support.',
  },
  {
    title: 'Provider obligations',
    body: 'Providers must submit accurate business information, hold any licences their services require, honour confirmed bookings and set fair policies. New listings are reviewed by the Bink team before going live, and Bink may suspend listings that breach these terms.',
  },
  {
    title: 'Reviews and content',
    body: 'You may review a Provider only after a completed visit. Reviews must be honest and respectful. Photos on Bink must not show people, faces or body parts. Bink may remove content that is unlawful, misleading or violates these rules, and ratings are recalculated when a review is removed.',
  },
  {
    title: 'Acceptable use and blocking',
    body: 'You must not misuse Bink - including fraudulent bookings, harassment through messaging, or attempts to circumvent payments. Bink may block accounts that violate these terms; blocked accounts cannot sign in, book, message or review.',
  },
  {
    title: 'Liability',
    body: 'Bink provides the platform "as is" and is not a party to the service agreement between you and a Provider. To the maximum extent permitted by law, Bink’s liability for any claim related to the platform is limited to the amounts you paid through Bink in the three months before the claim.',
  },
  {
    title: 'Changes to these terms',
    body: 'We may update these terms as the platform evolves. Material changes will be announced in the app, and continuing to use Bink after a change means you accept the updated terms.',
  },
  {
    title: 'Governing law',
    body: 'These terms are governed by the laws of the Kingdom of Saudi Arabia, and any dispute is subject to the exclusive jurisdiction of the competent courts of Riyadh.',
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 14, 2026"
      intro="These terms govern your use of the Bink platform - the website, mobile experience and related services. By creating an account or making a booking you agree to them, so please read them carefully. This document is a working draft prepared for review by legal counsel before public launch."
      sections={SECTIONS}
    />
  );
}
