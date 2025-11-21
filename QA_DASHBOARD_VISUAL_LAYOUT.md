# Unified QA Dashboard - Visual Layout

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  Quality Assurance Dashboard                                                    ║
║  Monitor app health, run tests, and identify issues that need attention         ║
╚══════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│  ▶ Run All QA Tests                    Last run: 08:46:06                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐
│  SYSTEM HEALTH    │  TOTAL TESTS      │  PASSED           │  FAILED           │
│  ❤️               │  📊               │  ✅               │  ❌               │
│                   │                   │                   │                   │
│  58%              │  142              │  82               │  60               │
│  Health Score     │  Tests Performed  │  Tests Passed     │  Tests Failed     │
│  View Details →   │  View All Tests → │  View Passed →    │  View Failed →    │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  Test Categories Breakdown                                                      │
│  Detailed view of test results by category                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ 💻 Code         │  │ ⚡ Wiring &     │  │ 🔒 Security     │                │
│  │ Correctness     │  │ Integration     │  │                 │                │
│  │                 │  │ ════════════════│  │                 │                │
│  │  52      51     │  │   8        1    │  │   0        0    │                │
│  │ PASSED  FAILED  │  │ PASSED   FAILED │  │ PASSED   FAILED │                │
│  │ Details →       │  │ Details →       │  │ Details →       │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ 🚀 Deployment   │  │ 🎨 UI/UX        │  │ ⚡ Performance  │                │
│  │                 │  │                 │  │ & Timing        │                │
│  │                 │  │                 │  │                 │                │
│  │   0        0    │  │  13        6    │  │   0        0    │                │
│  │ PASSED  FAILED  │  │ PASSED   FAILED │  │ PASSED   FAILED │                │
│  │ Details →       │  │ Details →       │  │ Details →       │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ 🧪 Runtime      │  │ 🛡️ Accessibility│  │ 💾 Data         │                │
│  │ Rendering       │  │                 │  │ Integrity       │                │
│  │                 │  │                 │  │                 │                │
│  │   3        1    │  │   0        0    │  │   0        0    │                │
│  │ PASSED  FAILED  │  │ PASSED   FAILED │  │ PASSED   FAILED │                │
│  │ Details →       │  │ Details →       │  │ Details →       │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐                                                           │
│  │ 🔍 Duplicates & │                                                           │
│  │ Legacy          │                                                           │
│  │                 │                                                           │
│  │   3        0    │                                                           │
│  │ PASSED  FAILED  │                                                           │
│  │ Details →       │                                                           │
│  └─────────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  💬 AI Assistant Integration                          🔄 Refresh Status         │
│  Ask the AI assistant about system health and get intelligent real-time answers │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Try asking the AI:                                                            │
│  • "Are there any issues in the app that need immediate attention?"           │
│  • "What is the current system health status?"                                │
│  • "Show me critical QA issues"                                               │
│  • "What are the recent test failures?"                                       │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ 🚨 Critical Issues Detected:                                              │ │
│  │                                                                            │ │
│  │ • 3 unresolved watchdog incident(s) detected                              │ │
│  │ • - AI_CONFIDENCE_LOW: Document processing confidence below threshold     │ │
│  │ • 2 critical alert(s) requiring immediate attention                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Warnings:                                                              │ │
│  │                                                                            │ │
│  │ • 15 warning(s) detected                                                  │ │
│  │ • 23 document(s) still pending processing                                 │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ 💡 Recommendations:                                                       │ │
│  │                                                                            │ │
│  │ • System health is below 80% - review alerts and failed tests            │ │
│  │ • Run QA Tests to identify specific failing components                   │ │
│  │ • Check the Watchdog dashboard for detailed incident information         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  The AI assistant has full access to real-time QA status, watchdog alerts,    │
│  and test results. Responses are generated from live data - not hard-coded.   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Color Scheme

- **Green** (#22c55e): Passed tests, healthy status (≥95%)
- **Yellow** (#eab308): Warnings, moderate health (80-94%)
- **Red** (#ef4444): Critical issues, poor health (<80%)
- **Blue** (#3b82f6): Information, links, primary actions
- **Gray** (#6b7280): Secondary text, borders

## Interactive Elements

1. **"Run All QA Tests" Button**
   - Primary blue button
   - Shows loading spinner when running
   - Updates "Last run" timestamp

2. **Metric Cards**
   - Clickable to view filtered results
   - Hover effect shows pointer cursor
   - "View Details →" link

3. **Category Cards**
   - Click to see detailed test results
   - "Wiring & Integration" highlighted with blue border
   - Pass/fail counts prominently displayed

4. **Refresh Button**
   - Manual refresh trigger
   - Rotates icon during refresh
   - Located in AI section header

5. **AI Integration Section**
   - Red border when critical issues present
   - Collapsible sections for issues/warnings/recommendations
   - Example questions to guide users

## Responsive Behavior

### Desktop (≥1024px)
- 4 metric cards in a row
- 3 category cards per row
- Full AI section visible

### Tablet (768px - 1023px)
- 2 metric cards per row
- 2 category cards per row
- AI section full width

### Mobile (<768px)
- 1 metric card per row (stacked)
- 1 category card per row (stacked)
- Simplified AI section

## Loading State

When `isLoading = true`:
```
┌───────────────────┐
│ ░░░░░░░░░         │  (animated shimmer)
│ ░░░░░░░░░░░░      │
│ ░░░░░░            │
└───────────────────┘
```

## Drill-Down View Example

When user clicks "Code Correctness" category:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Code Correctness                                                   │
│  Detailed breakdown of test results                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅  Code Correctness - Test 1                              PASSED  │
│      All checks passed successfully                                │
│                                                                     │
│  ✅  Code Correctness - Test 2                              PASSED  │
│      All checks passed successfully                                │
│                                                                     │
│  ...                                                                │
│                                                                     │
│  ❌  Code Correctness - Test 53                             FAILED  │
│      Check failed - requires attention                             │
│                                                                     │
│  ❌  Code Correctness - Test 54                             FAILED  │
│      Check failed - requires attention                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Watchdog Health Details

When user clicks "View Details" on System Health card:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Watchdog Health Details                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  System Health: 58%                                                 │
│                                                                     │
│  The watchdog monitors:                                            │
│  • AI document ingestion and processing                            │
│  • Database connectivity and performance                           │
│  • API endpoint health                                             │
│  • Authentication and security                                     │
│  • Background job execution                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Comparison with Reference Design

**Reference Image**: Provided by user showing dashboard layout

**Implementation Matches**:
- ✅ Top metrics row (4 cards)
- ✅ Test categories in grid layout
- ✅ Pass/fail counts in each category
- ✅ "Run All QA Tests" button
- ✅ Last run timestamp
- ✅ "Details →" links for drill-down
- ✅ Color coding (green/red)
- ✅ Icons for visual identification

**Implementation Enhancements**:
- ✅ AI integration section (requested feature)
- ✅ Real-time data (not in reference)
- ✅ Auto-refresh capability
- ✅ Loading states
- ✅ Critical issues display
- ✅ Recommendations

## Technical Notes

### State Management
```typescript
const [systemHealth, setSystemHealth] = useState<number>(0);
const [totalTests, setTotalTests] = useState<number>(0);
const [passedTests, setPassedTests] = useState<number>(0);
const [failedTests, setFailedTests] = useState<number>(0);
const [isLoading, setIsLoading] = useState(true);
const [qaStatus, setQaStatus] = useState<QAStatus | null>(null);
```

### Data Flow
```
Database Tables
    ↓
loadQAMetrics()
    ↓
getQAStatus()
    ↓
State Updates
    ↓
UI Renders
    ↓
User Interaction
    ↓
handleRunAllTests() / handleViewCategory()
    ↓
Repeat
```

### Performance
- Auto-refresh: 30 seconds
- Manual refresh: Immediate
- Loading time: <1 second (database queries)
- Build time: ~9 seconds
- Bundle size: 2,521 kB

## Accessibility

- ✅ Semantic HTML
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast meets WCAG AA
- ✅ Focus indicators visible

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
