/**
 * Master Script Runner
 * 
 * Executes all data creation scripts in the correct order to populate
 * the hospital management system with realistic test data.
 */

const { spawn } = require('child_process');
const path = require('path');

const SCRIPTS = [
  {
    name: 'Doctor Schedules',
    file: 'createDoctorSchedules.js',
    description: 'Creates personalized shift schedules based on specialization and department',
    args: ['--preserve-existing']
  },
  {
    name: 'Appointments',
    file: 'createAppointments.js', 
    description: 'Creates realistic appointments between patients and doctors',
    args: ['--count=60']
  },
  {
    name: 'Medical Records',
    file: 'createMedicalRecords.js',
    description: 'Creates comprehensive medical records for completed appointments',
    args: []
  },
  {
    name: 'Leave Requests',
    file: 'createLeaveRequests.js',
    description: 'Creates various types of leave requests with realistic timelines',
    args: []
  },
  {
    name: 'Overtime Requests', 
    file: 'createOvertimeRequests.js',
    description: 'Creates overtime requests with financial calculations',
    args: []
  },
  {
    name: 'Shift Swap Requests',
    file: 'createShiftSwapRequests.js',
    description: 'Creates shift swap requests between doctors',
    args: []
  }
];

// Refund Management Scripts (run separately as needed)
const REFUND_SCRIPTS = [
  {
    name: 'Process Refunds',
    file: 'processRefunds.js',
    description: 'Processes refunds for cancelled appointments with payment integration',
    args: ['--dry-run'] // Safe default - shows what would be refunded
  },
  {
    name: 'Refund Analytics',
    file: 'refundAnalytics.js', 
    description: 'Generates comprehensive refund analytics and financial insights',
    args: []
  }
];

function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running ${script.name}...`);
    console.log(`   ${script.description}`);
    
    const scriptPath = path.join(__dirname, script.file);
    const child = spawn('node', [scriptPath, ...script.args], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${script.name} completed successfully`);
        resolve();
      } else {
        console.log(`❌ ${script.name} failed with code ${code}`);
        reject(new Error(`Script ${script.name} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ Error running ${script.name}:`, error.message);
      reject(error);
    });
  });
}

async function runAllScripts() {
  console.log('🏥 Hospital Data Population Suite');
  console.log('=================================');
  console.log(`About to run ${SCRIPTS.length} scripts to populate your database with test data.\n`);
  
  // Check command line arguments
  const clearAll = process.argv.includes('--clear-all');
  const skipConfirm = process.argv.includes('--yes');
  
  if (clearAll) {
    console.log('⚠️  WARNING: --clear-all flag detected!');
    console.log('   This will delete ALL existing data before creating new data.\n');
  }
  
  if (!skipConfirm) {
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  const startTime = Date.now();
  let completed = 0;
  
  try {
    for (const script of SCRIPTS) {
      const scriptArgs = clearAll ? [...script.args, '--clear'] : script.args;
      await runScript({ ...script, args: scriptArgs });
      completed++;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n🎉 All scripts completed successfully!');
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`📊 Completed ${completed}/${SCRIPTS.length} scripts`);
    console.log('\n📋 What was created:');
    console.log('   • Personalized doctor schedules based on specialization');
    console.log('   • Realistic appointments with proper timing');
    console.log('   • Comprehensive medical records with prescriptions');
    console.log('   • Leave requests for various scenarios');
    console.log('   • Overtime requests with financial data');
    console.log('   • Shift swap requests between doctors');
    console.log('\n� Refund Management:');
    console.log('   To process refunds: node processRefunds.js [--dry-run|--process-all]');
    console.log('   For refund analytics: node refundAnalytics.js');
    console.log('\n�🚀 Your hospital management system is now ready for testing!');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n❌ Script execution failed after ${duration} seconds`);
    console.log(`📊 Completed ${completed}/${SCRIPTS.length} scripts`);
    console.log(`💥 Error: ${error.message}`);
    console.log('\n🔧 Fix the issue and run again to continue data population.');
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🏥 Hospital Data Population Suite');
  console.log('=================================\n');
  console.log('Usage: node runAllScripts.js [options]\n');
  console.log('Options:');
  console.log('  --clear-all    Clear all existing data before creating new data');
  console.log('  --yes          Skip confirmation prompt');
  console.log('  --help, -h     Show this help message\n');
  console.log('Individual Scripts:');
  SCRIPTS.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.name}`);
    console.log(`     ${script.description}`);
    console.log(`     File: ${script.file}\n`);
  });
  
  console.log('Refund Management Scripts:');
  REFUND_SCRIPTS.forEach((script, index) => {
    console.log(`  R${index + 1}. ${script.name}`);
    console.log(`     ${script.description}`);
    console.log(`     File: ${script.file}\n`);
  });
  process.exit(0);
}

runAllScripts();