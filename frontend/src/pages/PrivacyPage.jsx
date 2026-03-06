import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'

const EFFECTIVE_DATE = 'March 5, 2026'
const CONTACT_EMAIL  = 'helpcyntax@gmail.com'
const COMPANY_NAME   = 'DocuFlow'
const APP_URL        = 'https://www.docuflow.app'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Sticky Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '20px 0',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>{COMPANY_NAME}</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontFamily: 'var(--font-body)', padding: '8px 0' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 32px 96px' }}>

        <div style={{ marginBottom: '56px' }}>
          <p style={{ color: 'var(--accent-light)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Legal</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px', lineHeight: 1.1 }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Effective date: <strong style={{ color: 'var(--text-primary)' }}>{EFFECTIVE_DATE}</strong>
            &nbsp;·&nbsp;
            Last updated: <strong style={{ color: 'var(--text-primary)' }}>{EFFECTIVE_DATE}</strong>
          </p>
          <div style={{ marginTop: '24px', padding: '16px 20px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent2)' }}>Summary:</strong> We collect only what we need — your name, email, and profile picture from Google — to provide the Service. We do not sell your data. Your uploaded files are processed and deleted; they are not stored permanently or shared with third parties beyond the service providers listed below.
          </div>
        </div>

        <LegalSection title="1. Introduction">
          <p>
            {COMPANY_NAME} ("we", "our", "us") operates the document conversion and AI generation platform
            available at <a href={APP_URL} style={linkStyle}>{APP_URL}</a> (the "Service"). This Privacy Policy
            explains how we collect, use, store, share, and protect your personal information when you use the Service.
          </p>
          <p>
            By using the Service, you consent to the practices described in this Privacy Policy. If you do not agree,
            please discontinue use of the Service and contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a> to
            request deletion of any data we hold about you.
          </p>
          <p>
            This Privacy Policy should be read alongside our <a href="/terms" style={linkStyle}>Terms of Service</a>.
          </p>
        </LegalSection>

        <LegalSection title="2. Data Controller">
          <p>
            {COMPANY_NAME} is the data controller for personal information collected through the Service. For questions
            about how your data is handled, contact our privacy team:
          </p>
          <div style={{ marginTop: '12px', padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
            <p><strong>Email:</strong> <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a></p>
            <p style={{ marginTop: '6px' }}><strong>Website:</strong> <a href={APP_URL} style={linkStyle}>{APP_URL}</a></p>
          </div>
        </LegalSection>

        <LegalSection title="3. Information We Collect">
          <p>We collect the following categories of personal data:</p>

          <SubHeading>3.1 Account Information (via Google OAuth)</SubHeading>
          <p>When you sign in with Google, we receive and store the following data from your Google account:</p>
          <ul style={listStyle}>
            <li><strong>Full name</strong> — used to personalise your experience within the Service.</li>
            <li><strong>Email address</strong> — used as your account identifier, for authentication, and for transactional communications (e.g., payment receipts).</li>
            <li><strong>Profile picture URL</strong> — used to display your avatar in the application interface.</li>
            <li><strong>Google user ID</strong> — used to uniquely identify your account and link it to your Google profile.</li>
          </ul>
          <p>We do not receive or store your Google password, payment methods saved to Google, or any other data from your Google account beyond the above.</p>

          <SubHeading>3.2 Usage Data</SubHeading>
          <p>We automatically collect the following when you use the Service:</p>
          <ul style={listStyle}>
            <li><strong>Job records</strong> — metadata about each conversion or AI task: file format, file size, conversion status, timestamp, tokens consumed, and any error message. File content is not stored permanently.</li>
            <li><strong>Token balance and transaction history</strong> — your current token balance, tokens purchased, tokens consumed, and individual transaction records (date, amount, type).</li>
            <li><strong>Payment records</strong> — pack purchased, amount paid, currency, payment status, and Paystack transaction reference. We do not store your card details; these are handled exclusively by Paystack.</li>
          </ul>

          <SubHeading>3.3 Technical Data</SubHeading>
          <ul style={listStyle}>
            <li><strong>IP address</strong> — collected by our server infrastructure for security, fraud prevention, and abuse detection. Not linked to your profile for advertising purposes.</li>
            <li><strong>Browser and device information</strong> — collected via standard HTTP headers for debugging and compatibility purposes.</li>
            <li><strong>Access logs</strong> — standard server logs including timestamps, endpoints accessed, and HTTP status codes, retained for up to 30 days.</li>
          </ul>

          <SubHeading>3.4 Files and Documents</SubHeading>
          <p>
            Files you upload for conversion or AI processing are transmitted securely to our servers, processed in isolated
            temporary directories, and deleted immediately upon completion of the task. We do not analyse, index, or retain
            the content of your uploaded files for any purpose other than fulfilling the requested conversion or AI task.
          </p>
          <p>
            Temporary files generated during conversion are deleted from the processing server within minutes. If Cloudflare R2
            storage is used to facilitate the transfer of output files, those files are deleted within 24 hours of the job
            completing.
          </p>
        </LegalSection>

        <LegalSection title="4. How We Use Your Information">
          <p>We use the information we collect for the following purposes:</p>
          <ul style={listStyle}>
            <li><strong>Account management:</strong> Creating and maintaining your account, authenticating your identity, and providing access to the Service.</li>
            <li><strong>Service delivery:</strong> Processing your file conversions and AI document requests, managing your token balance, and storing your conversion history.</li>
            <li><strong>Payments:</strong> Processing token purchases via Paystack and maintaining payment records for your reference and our accounting obligations.</li>
            <li><strong>Communications:</strong> Sending transactional emails (payment confirmations, account notices). We do not send marketing emails without your explicit consent.</li>
            <li><strong>Security and fraud prevention:</strong> Detecting and preventing unauthorised access, abuse, and fraudulent activity.</li>
            <li><strong>Service improvement:</strong> Analysing aggregate, anonymised usage patterns to improve performance, reliability, and features. This analysis does not involve reviewing the content of your files.</li>
            <li><strong>Legal compliance:</strong> Meeting our obligations under applicable laws and regulations.</li>
          </ul>
          <p>
            We do not use your data for advertising purposes, and we do not sell, rent, or trade your personal information
            to any third party.
          </p>
        </LegalSection>

        <LegalSection title="5. Legal Basis for Processing">
          <p>Where applicable data protection law requires a legal basis for processing, we rely on the following:</p>
          <ul style={listStyle}>
            <li><strong>Contract performance:</strong> Processing necessary to provide the Service you have requested, including account creation, file conversion, and payment processing.</li>
            <li><strong>Legitimate interests:</strong> Security monitoring, fraud prevention, service improvement through anonymised analytics, and maintaining server logs.</li>
            <li><strong>Legal obligation:</strong> Retaining payment records as required by financial regulations.</li>
            <li><strong>Consent:</strong> Where you have explicitly given consent, such as agreeing to this Privacy Policy at account creation.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Data Sharing and Third-Party Processors">
          <p>
            We share your personal data only with the following third-party service providers ("processors") who act on
            our behalf and are contractually obligated to protect your data:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {[
              {
                name: 'Google LLC',
                purpose: 'OAuth 2.0 authentication — verifies your identity via your Google account.',
                data: 'User ID, name, email, profile picture.',
                policy: 'https://policies.google.com/privacy',
              },
              {
                name: 'Anthropic, PBC',
                purpose: 'AI document generation and processing — your prompts and document content are sent to Anthropic\'s Claude API.',
                data: 'Text content of documents submitted for AI processing.',
                policy: 'https://www.anthropic.com/privacy',
              },
              {
                name: 'Paystack Inc.',
                purpose: 'Payment processing — handles all credit/debit card transactions for token purchases.',
                data: 'Email address, payment amount, transaction reference. Card details are processed directly by Paystack and never transmitted to our servers.',
                policy: 'https://paystack.com/privacy',
              },
              {
                name: 'Cloudflare, Inc.',
                purpose: 'File storage (R2) — temporary encrypted storage of output files pending download.',
                data: 'Encrypted file content, stored for a maximum of 24 hours.',
                policy: 'https://www.cloudflare.com/privacypolicy/',
              },
            ].map(({ name, purpose, data, policy }) => (
              <div key={name} style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{name}</p>
                <p style={{ marginBottom: '4px' }}><strong>Purpose:</strong> {purpose}</p>
                <p style={{ marginBottom: '4px' }}><strong>Data shared:</strong> {data}</p>
                <p><strong>Privacy policy:</strong> <a href={policy} target="_blank" rel="noopener noreferrer" style={linkStyle}>{policy}</a></p>
              </div>
            ))}
          </div>

          <p style={{ marginTop: '16px' }}>
            We do not share your data with any other third parties except where required by law (e.g., in response to a
            valid court order, subpoena, or legal process), in which case we will notify you to the extent permitted by law.
          </p>
        </LegalSection>

        <LegalSection title="7. Data Retention">
          <p>We retain your personal data for the following periods:</p>
          <ul style={listStyle}>
            <li><strong>Account data</strong> (name, email, profile picture, Google user ID): Retained for as long as your account is active. Deleted within 30 days of account closure.</li>
            <li><strong>Job records and conversion history:</strong> Retained until you delete them or close your account. Metadata only — file content is never retained.</li>
            <li><strong>Payment records:</strong> Retained for 7 years from the date of transaction to comply with financial record-keeping obligations.</li>
            <li><strong>Token transaction history:</strong> Retained for the lifetime of your account for your reference and our audit purposes.</li>
            <li><strong>Server access logs:</strong> Retained for up to 30 days, then automatically deleted.</li>
            <li><strong>Uploaded files:</strong> Deleted immediately upon job completion. Temporary output files in cloud storage deleted within 24 hours.</li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Data Security">
          <p>
            We implement industry-standard security measures to protect your personal data against unauthorised access,
            alteration, disclosure, or destruction:
          </p>
          <ul style={listStyle}>
            <li>All data in transit is encrypted using TLS 1.2 or higher (HTTPS).</li>
            <li>Files stored in Cloudflare R2 are encrypted at rest using AES-256.</li>
            <li>Authentication tokens (JWTs) are signed with a strong secret key and expire after 7 days.</li>
            <li>Database access is restricted to application servers via private network; direct public access is disabled.</li>
            <li>File processing occurs in isolated temporary directories that are deleted after each job.</li>
            <li>We do not store payment card data — all payment processing is delegated entirely to Paystack.</li>
          </ul>
          <p>
            Despite our efforts, no method of transmission over the Internet or electronic storage is 100% secure.
            In the event of a data breach that affects your personal data, we will notify you within 72 hours of
            becoming aware of the breach, to the extent required by applicable law.
          </p>
        </LegalSection>

        <LegalSection title="9. Cookies and Tracking">
          <p>
            {COMPANY_NAME} does not use advertising cookies, tracking pixels, or third-party analytics services (such as
            Google Analytics). We do not build user profiles for advertising purposes.
          </p>
          <p>The Service uses the following limited storage mechanisms:</p>
          <ul style={listStyle}>
            <li><strong>Local storage (browser):</strong> Your authentication token (JWT) and basic account information are stored in your browser's local storage to maintain your session. This data never leaves your browser to third parties.</li>
            <li><strong>Session management:</strong> No server-side session cookies are used. Authentication is stateless via JWT.</li>
          </ul>
        </LegalSection>

        <LegalSection title="10. Your Rights">
          <p>
            Depending on your jurisdiction, you may have the following rights with respect to your personal data.
            To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>.
            We will respond within 30 days.
          </p>
          <ul style={listStyle}>
            <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete personal data.</li>
            <li><strong>Right to erasure ("right to be forgotten"):</strong> Request deletion of your personal data. Note: payment records may be retained as required by law.</li>
            <li><strong>Right to data portability:</strong> Request your personal data in a structured, machine-readable format.</li>
            <li><strong>Right to restriction:</strong> Request that we restrict processing of your personal data in certain circumstances.</li>
            <li><strong>Right to object:</strong> Object to processing of your personal data where we rely on legitimate interests as our legal basis.</li>
            <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
          </ul>
          <p>
            If you are located in the European Economic Area, United Kingdom, or another jurisdiction with applicable
            data protection laws, you also have the right to lodge a complaint with your local supervisory authority.
          </p>
        </LegalSection>

        <LegalSection title="11. Children's Privacy">
          <p>
            The Service is not directed at children under the age of 16. We do not knowingly collect personal data
            from children under 16. If you become aware that a child has provided us with personal information without
            parental consent, please contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a> and
            we will take steps to delete such information.
          </p>
        </LegalSection>

        <LegalSection title="12. International Data Transfers">
          <p>
            {COMPANY_NAME} operates globally, and your data may be processed by our service providers in countries outside
            your own. Specifically, Anthropic and Cloudflare are US-based companies, and Paystack operates across Africa
            and internationally. These transfers are governed by the respective providers' data protection commitments
            and, where applicable, standard contractual clauses or equivalent safeguards.
          </p>
          <p>
            By using the Service, you consent to the transfer of your information to countries that may have different
            data protection rules than your country of residence.
          </p>
        </LegalSection>

        <LegalSection title="13. Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or
            legal requirements. When we make material changes, we will update the "Last updated" date at the top of
            this page and notify you via email. Your continued use of the Service after the effective date of any
            changes constitutes your acceptance of the revised Privacy Policy.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically. Previous versions are available upon request.
          </p>
        </LegalSection>

        <LegalSection title="14. Contact Us">
          <p>
            For any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact
            our privacy team:
          </p>
          <div style={{ marginTop: '16px', padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ marginBottom: '4px' }}><strong>{COMPANY_NAME} — Privacy Team</strong></p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a></p>
            <p style={{ marginTop: '4px' }}>Website: <a href={APP_URL} style={linkStyle}>{APP_URL}</a></p>
          </div>
        </LegalSection>

      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <a href="/terms"   style={{ ...linkStyle, color: 'var(--text-muted)' }}>Terms of Service</a>
          <a href="/privacy" style={{ ...linkStyle, color: 'var(--text-muted)' }}>Privacy Policy</a>
          <a href="/login"   style={{ ...linkStyle, color: 'var(--text-muted)' }}>Sign In</a>
        </div>
        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

function LegalSection({ title, children }) {
  return (
    <section style={{ marginBottom: '48px' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '18px',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  )
}

function SubHeading({ children }) {
  return (
    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', marginBottom: '4px', fontSize: '14px', letterSpacing: '0.01em' }}>
      {children}
    </p>
  )
}

const linkStyle = {
  color: 'var(--accent-light)',
  textDecoration: 'none',
  borderBottom: '1px solid rgba(139,132,255,0.3)',
}

const listStyle = {
  paddingLeft: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}