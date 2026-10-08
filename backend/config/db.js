import dns from 'dns';
import mongoose from 'mongoose';

// Fallback resolvers for mongodb+srv:// lookups. Some machines (VPNs, local DNS proxies)
// point Node at a resolver that refuses SRV queries, giving "querySrv ECONNREFUSED".
// Override with DNS_SERVERS=1.1.1.1,8.8.8.8 in .env if needed.
const FALLBACK_DNS = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map(s => s.trim()).filter(Boolean);

const isSrvDnsError = (err) =>
  /querySrv|queryTxt/.test(err?.message || '') && /ECONNREFUSED|ETIMEOUT|ESERVFAIL|ENOTFOUND/.test(err?.code || err?.message || '');

export const connectdb = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("DB connection error: MONGODB_URI is not set in backend/.env");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB connected !!!");
  } catch (error) {
    if (!isSrvDnsError(error)) {
      console.log("DB connection error:", error.message);
      return;
    }
    console.warn(`DB SRV lookup failed via ${dns.getServers().join(', ')}; retrying with ${FALLBACK_DNS.join(', ')}`);
    try {
      dns.setServers(FALLBACK_DNS);
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("DB connected !!!");
    } catch (retryError) {
      console.log("DB connection error:", retryError.message);
    }
  }
};
