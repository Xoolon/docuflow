import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'

const EFFECTIVE_DATE = 'March 5, 2026'
const CONTACT_EMAIL  = 'helpcyntax@gmail.com'
const COMPANY_NAME   = 'DocuFlow'
const APP_URL        = 'https://www.docxflow.site'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* Header */}
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
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '64px 32px 96px' }}>

        <div style={{ marginBottom: '56px' }}>
          <p style={{ color: 'var(--accent-light)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Legal</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px', lineHeight: 1.1 }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Effective date: <strong style={{ color: 'var(--text-primary)' }}>{EFFECTIVE_DATE}</strong>
            &nbsp;·&nbsp;
            Last updated: <strong style={{ color: 'var(--text-primary)' }}>{EFFECTIVE_DATE}</strong>
          </p>
        </div>

        <LegalSection title="1. Agreement to These Terms">
          <p>By accessing or using {COMPANY_NAME} ("Service", "Platform", "we", "us", or "our") at <a href={APP_URL} style={linkStyle}>{APP_URL}</a>, you ("User", "you") agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree with any of these Terms, you are prohibited from using or accessing the Service.</p>
          <p>These Terms constitute a legally binding agreement between you and {COMPANY_NAME}. We reserve the right to modify these Terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms. We will notify you of material changes via the email address associated with your account.</p>
        </LegalSection>

        <LegalSection title="2. Description of Service">
          <p>{COMPANY_NAME} is a web-based document conversion and AI-powered document generation platform. The Service enables users to:</p>
          <ul style={listStyle}>
            <li>Convert files between supported formats including PDF, DOCX, TXT, HTML, Markdown, CSV, XLSX, and image formats (JPG, PNG, WEBP, HEIC, SVG, GIF).</li>
            <li>Generate, improve, rewrite, and transform documents using artificial intelligence powered by Anthropic's Claude API.</li>
            <li>Store and retrieve conversion history and generated documents.</li>
            <li>Manage a token-based credit wallet for accessing paid features.</li>
          </ul>
          <p>The Service is provided "as is" and is subject to change without notice. We may add, modify, or remove features at our discretion.</p>
        </LegalSection>

        <LegalSection title="3. Eligibility and Account Registration">
          <p>You must be at least 16 years of age to use the Service. By registering, you represent and warrant that you meet this age requirement and that all information you provide is accurate, current, and complete.</p>
          <p>Account registration is performed exclusively via Google OAuth 2.0 ("Sign in with Google"). By registering, you authorise {COMPANY_NAME} to access the basic profile information provided by Google (name, email address, and profile picture) for the purpose of creating and managing your account.</p>
          <p>You are responsible for maintaining the security of your Google account credentials. You agree to notify us immediately at <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a> if you suspect any unauthorised access to your account. {COMPANY_NAME} is not liable for any loss or damage arising from your failure to comply with these obligations.</p>
          <p>You may not create multiple accounts, use another person's account without authorisation, or create an account on behalf of another person without their consent.</p>
        </LegalSection>

        <LegalSection title="4. Token-Based Credit System">
          <p>{COMPANY_NAME} operates on a token credit system. Each new account receives <strong>10,000 free tokens</strong> upon registration, with no credit card required.</p>
          <p><strong>Token costs:</strong></p>
          <ul style={listStyle}>
            <li>Document conversion (PDF, DOCX, TXT, HTML, Markdown, CSV, XLSX): 500 tokens per conversion.</li>
            <li>Image conversion (JPG, PNG, WEBP, HEIC, SVG, GIF): 200 tokens per conversion.</li>
            <li>AI document generation and processing: charged based on the number of input and output tokens consumed by the underlying AI model, at the prevailing rate displayed in the application.</li>
          </ul>
          <p><strong>Purchases:</strong> Additional tokens may be purchased via Paystack. All purchases are final and non-refundable except where required by applicable law or at our sole discretion in cases of technical error. Token balances do not expire while your account remains active.</p>
          <p><strong>Free tier:</strong> Documents and files converted using free tokens (i.e., before any token purchase) will include a visible watermark. This watermark is removed upon completing a token purchase.</p>
          <p>We reserve the right to modify token pricing, costs per operation, and free-tier allocations at any time with reasonable notice. Existing purchased token balances will not be retroactively adjusted.</p>
        </LegalSection>

        <LegalSection title="5. Acceptable Use Policy">
          <p>You agree to use the Service only for lawful purposes and in a manner that does not infringe the rights of others. You must not:</p>
          <ul style={listStyle}>
            <li>Upload, process, or generate content that is unlawful, defamatory, obscene, offensive, hateful, or that constitutes harassment, abuse, or threats.</li>
            <li>Upload files containing malware, viruses, ransomware, spyware, or any malicious code.</li>
            <li>Use the AI features to generate content that spreads misinformation, facilitates fraud, or violates third-party intellectual property rights.</li>
            <li>Attempt to reverse engineer, decompile, disassemble, or extract source code from the Service.</li>
            <li>Use automated tools, bots, or scripts to access the Service in a manner that exceeds reasonable use or disrupts Service performance.</li>
            <li>Circumvent, disable, or interfere with security-related features of the Service.</li>
            <li>Resell, sublicense, or commercially exploit the Service without our express written consent.</li>
            <li>Process files containing personal data of third parties without the appropriate legal basis to do so.</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate this Acceptable Use Policy, without notice and without liability.</p>
        </LegalSection>

        <LegalSection title="6. Intellectual Property">
          <p><strong>Your content:</strong> You retain full ownership of all files, documents, and content you upload to or generate using the Service. By uploading content, you grant {COMPANY_NAME} a limited, non-exclusive, royalty-free licence to process, store, and transmit your content solely for the purpose of providing the Service. This licence terminates when you delete your content or close your account.</p>
          <p><strong>Our intellectual property:</strong> The Service, including its design, code, branding, and all original content created by {COMPANY_NAME}, is owned by {COMPANY_NAME} and protected by copyright, trademark, and other applicable intellectual property laws. You may not copy, reproduce, distribute, or create derivative works from our intellectual property without express written permission.</p>
          <p><strong>AI-generated content:</strong> Content generated by the AI features is provided to you for your use. You are responsible for reviewing AI-generated output and ensuring it meets your requirements. {COMPANY_NAME} makes no representations regarding the accuracy, completeness, or fitness for purpose of AI-generated content.</p>
        </LegalSection>

        <LegalSection title="7. Privacy and Data Processing">
          <p>Your use of the Service is governed by our <a href="/privacy" style={linkStyle}>Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in our Privacy Policy.</p>
          <p>Files you upload are processed in isolated temporary environments and are not retained beyond the period necessary to complete the conversion or AI task, unless you have active jobs stored in your conversion history, in which case metadata (but not file content) may be retained for your reference.</p>
        </LegalSection>

        <LegalSection title="8. Third-Party Services">
          <p>The Service integrates with the following third-party services:</p>
          <ul style={listStyle}>
            <li><strong>Google OAuth 2.0</strong> — for account authentication. Governed by Google's Terms of Service and Privacy Policy.</li>
            <li><strong>Anthropic Claude API</strong> — for AI document generation. Your prompts and document content are processed by Anthropic in accordance with their usage policies.</li>
            <li><strong>Paystack</strong> — for payment processing. Payment data is processed by Paystack and governed by their Terms of Service and Privacy Policy.</li>
            <li><strong>Cloudflare R2</strong> — for encrypted file storage. Files are stored in accordance with Cloudflare's data processing policies.</li>
          </ul>
          <p>We are not responsible for the practices of these third-party services. We encourage you to review their respective terms and privacy policies.</p>
        </LegalSection>

        <LegalSection title="9. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</p>
          <p>We do not warrant the accuracy, reliability, or completeness of any content generated by AI features. AI-generated content should be reviewed and verified before professional, medical, legal, or financial use.</p>
        </LegalSection>

        <LegalSection title="10. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY_NAME.toUpperCase()} AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
          <p>OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO {COMPANY_NAME.toUpperCase()} IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR USD $10, WHICHEVER IS GREATER.</p>
        </LegalSection>

        <LegalSection title="11. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless {COMPANY_NAME} and its officers, directors, employees, contractors, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property rights; or (d) any content you upload, process, or generate using the Service.</p>
        </LegalSection>

        <LegalSection title="12. Account Termination">
          <p><strong>By you:</strong> You may close your account at any time by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>. Upon closure, your account data will be deleted within 30 days, subject to any retention obligations required by law. Unused token balances are non-refundable upon voluntary account closure.</p>
          <p><strong>By us:</strong> We reserve the right to suspend or permanently terminate your account at our discretion, including for violation of these Terms, suspected fraud, illegal activity, or extended inactivity. We will endeavour to provide notice before termination where feasible, except in cases of serious violation or legal requirement.</p>
        </LegalSection>

        <LegalSection title="13. Governing Law and Dispute Resolution">
          <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising under these Terms shall first be attempted to be resolved through good-faith negotiation. If not resolved within 30 days, disputes may be submitted to binding arbitration or the competent courts of the jurisdiction where {COMPANY_NAME} is operated.</p>
        </LegalSection>

        <LegalSection title="14. Changes to the Service">
          <p>We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.</p>
        </LegalSection>

        <LegalSection title="15. Entire Agreement">
          <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and {COMPANY_NAME} with respect to the Service and supersede all prior or contemporaneous communications, whether written or oral, relating to the subject matter hereof.</p>
          <p>If any provision of these Terms is found to be unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.</p>
        </LegalSection>

        <LegalSection title="16. Contact">
          <p>If you have questions about these Terms, please contact us:</p>
          <div style={{ marginTop: '16px', padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ marginBottom: '4px' }}><strong>{COMPANY_NAME}</strong></p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a></p>
            <p>Website: <a href={APP_URL} style={linkStyle}>{APP_URL}</a></p>
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