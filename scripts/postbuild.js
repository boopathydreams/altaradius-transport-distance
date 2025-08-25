#!/usr/bin/env node

import { execSync } from 'child_process';

async function runPostBuild() {
  try {
    console.log('Post-build script starting...');

    // Check if sequence fix should run
    if (process.env.RUN_SEQUENCE_FIX === 'true') {
      console.log('RUN_SEQUENCE_FIX is true, running sequence fix...');
      execSync('npm run fix-sequences', { stdio: 'inherit' });
      console.log('Sequence fix completed successfully!');
    } else {
      console.log('RUN_SEQUENCE_FIX not set to true, skipping sequence fix');
      console.log('Current RUN_SEQUENCE_FIX value:', process.env.RUN_SEQUENCE_FIX);
    }
  } catch (error) {
    console.error('Error in post-build script:', error.message);
    // Don't fail the build if sequence fix fails
    console.log('Continuing with deployment despite sequence fix error...');
  }
}

runPostBuild();
