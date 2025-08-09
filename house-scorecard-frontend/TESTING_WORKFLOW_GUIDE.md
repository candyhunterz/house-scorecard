# Testing Workflow Guide - When and How to Run Tests

This guide outlines **when** and **how** to run tests in your development workflow for maximum effectiveness and efficiency.

---

## 🔄 **Daily Development Workflow**

### 1. **Before Starting Work** (5 minutes)
```bash
# Quick smoke test to ensure everything works
npm test -- --passWithNoTests
```
**Purpose**: Verify your environment is ready and existing functionality isn't broken.

### 2. **While Developing** (Continuous)

#### For Component/UI Changes
```bash
# Run unit tests in watch mode
npm test -- --watch
```
**When**: Working on React components, contexts, or utilities  
**Why**: Immediate feedback on breaking changes

#### For New Features
```bash
# Run specific E2E test related to your feature
npx playwright test tests/e2e/property-workflow.spec.js --headed
```
**When**: Building new features like property management, auto-fill, etc.  
**Why**: Verify end-to-end functionality works as expected

### 3. **Before Committing Code** (10-15 minutes)
```bash
# Full test suite
npm test
npm run test:e2e
```
**Purpose**: Ensure all changes are working and no regressions introduced

---

## 📋 **Specific Development Scenarios**

### 🏠 **Working on Property Features**

#### Adding/Modifying Property Auto-Fill
```bash
# Test auto-fill functionality
npx playwright test tests/e2e/auto-fill.spec.js --headed --slow-mo=500
```
**Why**: Verify all real estate site integrations (Zealty, Realtor, Redfin) work

#### Working on AI Analysis
```bash
# Test AI analysis workflow
npx playwright test tests/e2e/ai-analysis.spec.js --headed
```
**Why**: Ensure AI integration, loading states, and error handling work

#### Property CRUD Operations
```bash
# Test complete property workflows
npx playwright test tests/e2e/property-workflow.spec.js --headed
```
**Why**: Verify add, edit, delete, status updates work end-to-end

### 🧭 **Working on Navigation/Auth**
```bash
# Test authentication flows
npx playwright test tests/e2e/auth.spec.js --headed

# Test unit components
npm test -- AuthContext.test.jsx --watch
```

### 📊 **Working on Criteria/Scoring**
```bash
# Test criteria management
npx playwright test tests/e2e/criteria.spec.js --headed
```

### 🔍 **Working on Property Comparison**
```bash
# Test comparison features
npx playwright test tests/e2e/comparison.spec.js --headed
```

---

## ⏰ **Testing Schedule by Development Phase**

### 🚀 **Active Feature Development**

**Multiple times per day:**
```bash
# Quick unit tests (30 seconds)
npm test -- ComponentName.test.jsx

# Specific E2E test for your feature (2-3 minutes)
npx playwright test tests/e2e/relevant-feature.spec.js --headed
```

### 🔧 **Bug Fixing**

**Before starting:**
```bash
# Reproduce the bug with tests
npx playwright test --grep "bug-related-keyword" --headed
```

**After fixing:**
```bash
# Verify fix works
npx playwright test tests/e2e/relevant-area.spec.js --headed

# Ensure no regressions
npm test
```

### 🎯 **Code Review Preparation**

**Before creating PR:**
```bash
# Full test suite (15-20 minutes)
npm test
npm run test:e2e
npm run lint
```

### 🚢 **Pre-Release Testing**

**Before deployment:**
```bash
# Comprehensive testing with reports
npm test -- --coverage
npm run test:e2e --reporter=html
npx playwright show-report
```

---

## 🎨 **Workflow by Team Role**

### 👨‍💻 **Frontend Developer**

#### Daily Routine
```bash
# Morning: Verify environment
npm test -- --passWithNoTests

# During development: Watch mode
npm test -- --watch

# Before commit
npm test
npm run lint
```

#### Feature Work
```bash
# Test your specific feature
npx playwright test tests/e2e/[your-feature].spec.js --headed --slow-mo=300
```

### 🔧 **Full-Stack Developer**

#### Daily Routine
```bash
# Start servers
python manage.py runserver    # Terminal 1
npm run dev                   # Terminal 2

# Test both ends
npm test                      # Frontend tests
python manage.py test         # Backend tests
npm run test:e2e             # Integration tests
```

### 🧪 **QA/Testing Focus**

#### Daily Testing
```bash
# Visual test runner for manual verification
npm run test:e2e:ui

# Generate comprehensive reports
npm run test:e2e --reporter=html
npx playwright show-report
```

---

## 🚨 **Critical Testing Moments**

### 🔴 **Must Run Tests Before:**

1. **Committing to main branch**
   ```bash
   npm test && npm run test:e2e
   ```

2. **Creating a Pull Request**
   ```bash
   npm test
   npm run test:e2e --reporter=html
   npm run lint
   ```

3. **Deploying to production**
   ```bash
   npm test
   npm run test:e2e
   npm run build  # Ensure build succeeds
   ```

4. **After pulling latest changes**
   ```bash
   npm test -- --passWithNoTests  # Quick smoke test
   ```

### 🟡 **Should Run Tests When:**

- Making UI component changes
- Modifying context/state management
- Adding new routes or navigation
- Changing API integrations
- Updating property auto-fill logic
- Modifying AI analysis workflow

### 🟢 **Good to Run Tests When:**

- Starting work on new feature
- Investigating bugs
- Refactoring code
- Updating dependencies

---

## ⚡ **Quick Reference Commands**

### 🏃‍♂️ **Fast Checks** (< 2 minutes)
```bash
# Unit tests only
npm test

# Single E2E test file
npx playwright test tests/e2e/auth.spec.js
```

### 🔍 **Development Testing** (2-5 minutes)
```bash
# Watch mode for active development
npm test -- --watch

# Visual E2E for feature you're working on
npx playwright test tests/e2e/property-workflow.spec.js --headed
```

### 🧪 **Comprehensive Testing** (15-20 minutes)
```bash
# Full test suite
npm test
npm run test:e2e
npm run lint
```

### 🚀 **Pre-Deployment** (20-30 minutes)
```bash
# Everything + reports
npm test -- --coverage
npm run test:e2e --reporter=html
npm run build
npx playwright show-report
```

---

## 🔧 **IDE Integration Tips**

### VS Code Extensions
- **Jest Runner**: Run individual tests from editor
- **Playwright Test**: Run E2E tests from editor
- **GitLens**: See test results in git history

### Keyboard Shortcuts Setup
```json
// In VS Code settings.json
{
  "keybindings": [
    {
      "key": "ctrl+shift+t",
      "command": "workbench.action.terminal.sendSequence",
      "args": {"text": "npm test\n"}
    }
  ]
}
```

---

## 📊 **Testing Metrics to Track**

### Daily Metrics
- ✅ All unit tests pass
- ✅ Critical E2E workflows pass
- ✅ No linting errors

### Weekly Metrics
- 📈 Test coverage percentage
- 🐛 Number of bugs caught by tests
- ⏱️ Test execution time trends

### Release Metrics
- 🎯 100% critical workflow coverage
- 📋 All E2E tests pass across browsers
- 🔍 Manual verification of test reports

---

## 🎯 **Recommended Testing Rhythm**

### 🌅 **Start of Day** (5 minutes)
```bash
git pull origin main
npm test -- --passWithNoTests
```

### 💻 **During Active Development** (Ongoing)
```bash
npm test -- --watch  # Keep running
```

### 🔄 **Before Each Commit** (10 minutes)
```bash
npm test
npm run test:e2e:ui  # Visual verification
```

### 📦 **End of Sprint/Before Release** (30 minutes)
```bash
npm test -- --coverage
npm run test:e2e --reporter=html
npm run build
npx playwright show-report
```

---

## 🚀 **Pro Tips**

### 💡 **Efficiency Tips**

1. **Use test patterns for focused testing:**
   ```bash
   npx playwright test --grep "auto-fill"
   npm test -- PropertyCard
   ```

2. **Run tests in parallel for speed:**
   ```bash
   npm run test:e2e --workers=4
   ```

3. **Use headed mode only when debugging:**
   ```bash
   npx playwright test --headed --slow-mo=500
   ```

### 🎯 **Quality Tips**

1. **Always run E2E tests after major changes**
2. **Use visual test runner to understand failures**
3. **Keep test data realistic (use actual URLs, real property data)**
4. **Update tests when adding new features**

### ⚠️ **Common Pitfalls to Avoid**

- ❌ **Don't skip tests** before committing
- ❌ **Don't ignore failing tests** ("I'll fix them later")  
- ❌ **Don't run only unit tests** without E2E verification
- ❌ **Don't forget to update tests** when changing features

---

**Remember**: Tests are your safety net! The few minutes spent running tests saves hours of debugging production issues. 🛡️