const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('Testing Supabase connection...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('churches')
      .select('id, name')
      .limit(1);

    if (error) {
      console.error('Connection failed:', error);
      return false;
    } else {
      console.log('✓ Connection successful');
      console.log('Sample data:', data);
      return true;
    }
  } catch (err) {
    console.error('Connection error:', err);
    return false;
  }
}

testConnection();
