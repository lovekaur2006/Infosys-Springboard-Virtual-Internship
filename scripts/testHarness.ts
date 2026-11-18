/**
 * Tiny test harness shared by the Task 5 test scripts.
 * Unlike a bare assert, it runs every case, prints a PASS/FAIL line for each
 * and exits with code 1 at the end if anything failed (so `npm run test:all` stops on failure).
 */
export interface CaseResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function createSuite(suite: string) {
  const results: CaseResult[] = [];
  return {
    results,
    test(name: string, fn: () => void) {
      try {
        fn();
        results.push({ suite, name, passed: true });
        console.log(`PASS  ${name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ suite, name, passed: false, error: message });
        console.log(`FAIL  ${name}\n      ${message.split('\n')[0]}`);
      }
    },
    finish(): never | void {
      const failed = results.filter((r) => !r.passed).length;
      console.log(`\n${suite}: ${results.length - failed}/${results.length} passed`);
      if (failed) process.exit(1);
    },
  };
}
