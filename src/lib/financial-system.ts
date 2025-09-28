import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Chart of Accounts Management
export class ChartOfAccountsService {
  // Initialize default chart of accounts for a new church
  async initializeDefaultAccounts(churchId: string): Promise<void> {
    const defaultAccounts = [
      // Assets
      { code: '1000', name: 'Cash - Operating', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1010', name: 'Cash - Savings', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1020', name: 'Petty Cash', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1200', name: 'Prepaid Expenses', type: 'ASSET', subType: 'CURRENT_ASSET' },
      { code: '1500', name: 'Building', type: 'ASSET', subType: 'FIXED_ASSET' },
      { code: '1510', name: 'Equipment', type: 'ASSET', subType: 'FIXED_ASSET' },
      { code: '1520', name: 'Accumulated Depreciation', type: 'ASSET', subType: 'FIXED_ASSET' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2010', name: 'Accrued Expenses', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2020', name: 'Payroll Liabilities', type: 'LIABILITY', subType: 'CURRENT_LIABILITY' },
      { code: '2500', name: 'Mortgage Payable', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY' },
      
      // Equity
      { code: '3000', name: 'Net Assets - Unrestricted', type: 'EQUITY', subType: 'RETAINED_EARNINGS' },
      { code: '3010', name: 'Net Assets - Restricted', type: 'EQUITY', subType: 'RETAINED_EARNINGS' },
      
      // Revenue
      { code: '4000', name: 'Tithes and Offerings', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4010', name: 'Special Offerings', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4020', name: 'Fundraising Income', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4030', name: 'Rental Income', type: 'REVENUE', subType: 'OPERATING_REVENUE' },
      { code: '4100', name: 'Investment Income', type: 'REVENUE', subType: 'NON_OPERATING_REVENUE' },
      
      // Expenses
      { code: '5000', name: 'Pastoral Salaries', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5010', name: 'Staff Salaries', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5020', name: 'Payroll Taxes', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5030', name: 'Benefits', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5100', name: 'Utilities', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5110', name: 'Insurance', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5120', name: 'Maintenance & Repairs', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5200', name: 'Office Supplies', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5210', name: 'Communications', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5300', name: 'Missions', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5310', name: 'Outreach Programs', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5400', name: 'Music Ministry', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5410', name: 'Youth Ministry', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' },
      { code: '5420', name: 'Children Ministry', type: 'EXPENSE', subType: 'OPERATING_EXPENSE' }
    ]

    for (const account of defaultAccounts) {
      await supabase
        .from('chart_of_accounts')
        .insert({
          church_id: churchId,
          account_code: account.code,
          account_name: account.name,
          account_type: account.type,
          sub_type: account.subType,
          description: `Default ${account.name} account`,
          is_active: true,
          balance: 0
        })
    }
  }

  async createAccount(data: {
    churchId: string
    accountCode: string
    accountName: string
    accountType: string
    subType: string
    parentId?: string
    description?: string
  }) {
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .insert({
        church_id: data.churchId,
        account_code: data.accountCode,
        account_name: data.accountName,
        account_type: data.accountType,
        sub_type: data.subType,
        parent_id: data.parentId,
        description: data.description,
        is_active: true,
        balance: 0
      })
      .select()
      .single()
    
    return account
  }

  async getAccountHierarchy(churchId: string) {
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .order('account_code', { ascending: true })
    
    return this.buildAccountTree(accounts || [])
  }

  private buildAccountTree(accounts: any[]): any[] {
    const accountMap = new Map()
    const rootAccounts: any[] = []

    // Create map of all accounts
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] })
    })

    // Build tree structure
    accounts.forEach(account => {
      if (account.parentId) {
        const parent = accountMap.get(account.parentId)
        if (parent) {
          parent.children.push(accountMap.get(account.id))
        }
      } else {
        rootAccounts.push(accountMap.get(account.id))
      }
    })

    return rootAccounts
  }

  async updateAccountBalance(accountId: string, amount: number, type: 'DEBIT' | 'CREDIT') {
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) throw new Error('Account not found')

    // Calculate new balance based on account type and transaction type
    let newBalance = account.balance
    
    if (account.account_type === 'ASSET' || account.account_type === 'EXPENSE') {
      // Assets and Expenses increase with debits, decrease with credits
      newBalance += type === 'DEBIT' ? amount : -amount
    } else {
      // Liabilities, Equity, and Revenue increase with credits, decrease with debits
      newBalance += type === 'CREDIT' ? amount : -amount
    }

    await supabase
      .from('chart_of_accounts')
      .update({ balance: newBalance })
      .eq('id', accountId)

    return newBalance
  }
}

// Budget Management
export class BudgetService {
  async createBudget(data: {
    churchId: string
    name: string
    description?: string
    fiscalYear: number
    startDate: Date
    endDate: Date
    totalAmount: number
  }) {
    const { data: budget } = await supabase
      .from('budgets')
      .insert({
        church_id: data.churchId,
        name: data.name,
        description: data.description,
        fiscal_year: data.fiscalYear,
        start_date: data.startDate.toISOString(),
        end_date: data.endDate.toISOString(),
        total_amount: data.totalAmount
      })
      .select()
      .single()
    
    return budget
  }

  async addBudgetItem(budgetId: string, accountId: string, budgetedAmount: number, notes?: string) {
    const { data: budgetItem } = await supabase
      .from('budget_items')
      .insert({
        budget_id: budgetId,
        account_id: accountId,
        budgeted_amount: budgetedAmount,
        notes
      })
      .select()
      .single()
    
    return budgetItem
  }

  async updateBudgetVariance(budgetId: string) {
    const { data: budgetItems } = await supabase
      .from('budget_items')
      .select(`
        *,
        account:chart_of_accounts(*)
      `)
      .eq('budget_id', budgetId)
    
    if (!budgetItems) return

    for (const item of budgetItems) {
      // Get transactions for this account in current year
      const { data: transactions } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', item.account_id)
        .gte('date', new Date(new Date().getFullYear(), 0, 1).toISOString())
        .lte('date', new Date(new Date().getFullYear(), 11, 31).toISOString())
      
      const actualAmount = (transactions || []).reduce((sum, transaction) => {
        return sum + (transaction.type === 'DEBIT' ? transaction.amount : -transaction.amount)
      }, 0)

      const variance = actualAmount - item.budgeted_amount

      await supabase
        .from('budget_items')
        .update({
          actual_amount: actualAmount,
          variance
        })
        .eq('id', item.id)
    }
  }

  async getBudgetVarianceReport(budgetId: string) {
    await this.updateBudgetVariance(budgetId)
    
    const { data: budget } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_items(
          *,
          account:chart_of_accounts(*)
        )
      `)
      .eq('id', budgetId)
      .single()
    
    return budget
  }
}

// Transaction Management
export class TransactionService {
  async recordTransaction(data: {
    churchId: string
    accountId: string
    amount: number
    type: 'DEBIT' | 'CREDIT'
    description: string
    reference?: string
    date: Date
    createdById: string
  }) {
    const { data: transaction } = await supabase
      .from('account_transactions')
      .insert({
        church_id: data.churchId,
        account_id: data.accountId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        reference: data.reference,
        date: data.date.toISOString(),
        created_by_id: data.createdById
      })
      .select()
      .single()

    // Update account balance
    const accountService = new ChartOfAccountsService()
    await accountService.updateAccountBalance(data.accountId, data.amount, data.type)

    return transaction
  }

  async getTransactionHistory(churchId: string, filters: {
    accountId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }) {
    const { accountId, startDate, endDate, limit = 50, offset = 0 } = filters

    let query = supabase
      .from('account_transactions')
      .select(`
        *,
        account:chart_of_accounts(*),
        created_by:users(first_name, last_name, email)
      `)
      .eq('church_id', churchId)
      .order('date', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (accountId) query = query.eq('account_id', accountId)
    if (startDate) query = query.gte('date', startDate.toISOString())
    if (endDate) query = query.lte('date', endDate.toISOString())

    const { data } = await query
    return data || []
  }
}

// Payroll Management
export class PayrollService {
  async createEmployee(data: {
    churchId: string
    employeeId: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
    position: string
    department?: string
    hireDate: Date
    salary?: number
    hourlyRate?: number
    taxInfo?: any
  }) {
    const { data: employee } = await supabase
      .from('employees')
      .insert({
        church_id: data.churchId,
        employee_id: data.employeeId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        position: data.position,
        department: data.department,
        hire_date: data.hireDate.toISOString(),
        salary: data.salary,
        hourly_rate: data.hourlyRate,
        tax_info: data.taxInfo
      })
      .select()
      .single()
    
    return employee
  }

  async recordTimeEntry(data: {
    employeeId: string
    date: Date
    hoursWorked: number
    description?: string
  }) {
    const { data: timeEntry } = await supabase
      .from('time_entries')
      .insert({
        employee_id: data.employeeId,
        date: data.date.toISOString(),
        hours_worked: data.hoursWorked,
        description: data.description,
        approved: false
      })
      .select()
      .single()
    
    return timeEntry
  }

  async calculatePayroll(employeeId: string, payPeriodStart: Date, payPeriodEnd: Date) {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (!employee) throw new Error('Employee not found')

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', payPeriodStart.toISOString())
      .lte('date', payPeriodEnd.toISOString())
      .eq('approved', true)

    let grossPay = 0

    if (employee.salary) {
      // Salaried employee - calculate based on pay frequency
      grossPay = employee.salary / 26 // Bi-weekly assumption
    } else if (employee.hourly_rate) {
      // Hourly employee - calculate based on time entries
      const totalHours = (timeEntries || []).reduce((sum: number, entry: any) => sum + entry.hours_worked, 0)
      grossPay = totalHours * employee.hourly_rate
    }

    // Calculate taxes and deductions (simplified)
    const federalTax = grossPay * 0.12 // 12% federal tax rate
    const stateTax = grossPay * 0.05 // 5% state tax rate
    const socialSecurity = grossPay * 0.062 // 6.2% Social Security
    const medicare = grossPay * 0.0145 // 1.45% Medicare

    const totalTaxes = federalTax + stateTax + socialSecurity + medicare
    const netPay = grossPay - totalTaxes

    return {
      grossPay,
      netPay,
      taxes: {
        federal: federalTax,
        state: stateTax,
        socialSecurity,
        medicare,
        total: totalTaxes
      }
    }
  }

  async processPayroll(employeeId: string, payPeriodStart: Date, payPeriodEnd: Date, payDate: Date) {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (!employee) throw new Error('Employee not found')

    const payrollCalculation = await this.calculatePayroll(employeeId, payPeriodStart, payPeriodEnd)

    const { data: payrollRecord } = await supabase
      .from('payroll_records')
      .insert({
        church_id: employee.church_id,
        employee_id: employeeId,
        pay_period_start: payPeriodStart.toISOString(),
        pay_period_end: payPeriodEnd.toISOString(),
        gross_pay: payrollCalculation.grossPay,
        net_pay: payrollCalculation.netPay,
        taxes: payrollCalculation.taxes,
        deductions: {}, // Additional deductions can be added here
        pay_date: payDate.toISOString()
      })
      .select()
      .single()
    
    return payrollRecord
  }
}

// Vendor and Expense Management
export class ExpenseService {
  async createVendor(data: {
    churchId: string
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
  }) {
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        church_id: data.churchId,
        name: data.name,
        contact_name: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tax_id: data.taxId
      })
      .select()
      .single()
    
    return vendor
  }

  async recordExpense(data: {
    churchId: string
    vendorId?: string
    accountId: string
    amount: number
    description: string
    date: Date
    receipt?: string
  }) {
    const { data: expense } = await supabase
      .from('expenses')
      .insert({
        church_id: data.churchId,
        vendor_id: data.vendorId,
        account_id: data.accountId,
        amount: data.amount,
        description: data.description,
        date: data.date.toISOString(),
        receipt: data.receipt,
        approved: false
      })
      .select()
      .single()

    // Record corresponding accounting transaction
    const transactionService = new TransactionService()
    await transactionService.recordTransaction({
      churchId: data.churchId,
      accountId: data.accountId,
      amount: data.amount,
      type: 'DEBIT', // Expenses are debits
      description: `Expense: ${data.description}`,
      reference: `EXP-${expense?.id}`,
      date: data.date,
      createdById: 'system' // This should be the actual user ID
    })

    return expense
  }

  async approveExpense(expenseId: string, approvedBy: string) {
    const { data: expense } = await supabase
      .from('expenses')
      .update({
        approved: true,
        approved_by: approvedBy
      })
      .eq('id', expenseId)
      .select()
      .single()
    
    return expense
  }

  async getExpenseReport(churchId: string, filters: {
    startDate?: Date
    endDate?: Date
    vendorId?: string
    accountId?: string
    approved?: boolean
  }) {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        vendor:vendors(*),
        account:chart_of_accounts(*)
      `)
      .eq('church_id', churchId)
      .order('date', { ascending: false })

    if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId)
    if (filters.accountId) query = query.eq('account_id', filters.accountId)
    if (filters.approved !== undefined) query = query.eq('approved', filters.approved)
    if (filters.startDate) query = query.gte('date', filters.startDate.toISOString())
    if (filters.endDate) query = query.lte('date', filters.endDate.toISOString())

    const { data } = await query
    return data || []
  }
}

// Financial Reporting
export class FinancialReportingService {
  async generateProfitLossStatement(churchId: string, startDate: Date, endDate: Date) {
    const { data: revenueAccounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('account_type', 'REVENUE')
      .eq('is_active', true)

    const { data: expenseAccounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('account_type', 'EXPENSE')
      .eq('is_active', true)

    const calculateAccountTotal = async (account: any) => {
      const { data: transactions } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', account.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
      
      return (transactions || []).reduce((sum: number, transaction: any) => {
        return sum + (transaction.type === 'CREDIT' ? transaction.amount : -transaction.amount)
      }, 0)
    }

    const revenue = await Promise.all((revenueAccounts || []).map(async (account: any) => ({
      ...account,
      total: await calculateAccountTotal(account)
    })))

    const expenses = await Promise.all((expenseAccounts || []).map(async (account: any) => ({
      ...account,
      total: await calculateAccountTotal(account)
    })))

    const totalRevenue = revenue.reduce((sum: number, account: any) => sum + account.total, 0)
    const totalExpenses = expenses.reduce((sum: number, account: any) => sum + account.total, 0)
    const netIncome = totalRevenue - totalExpenses

    return {
      period: { startDate, endDate },
      revenue,
      expenses,
      totals: {
        totalRevenue,
        totalExpenses,
        netIncome
      }
    }
  }

  async generateBalanceSheet(churchId: string, asOfDate: Date) {
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .in('account_type', ['ASSET', 'LIABILITY', 'EQUITY'])

    const assets = (accounts || []).filter((account: any) => account.account_type === 'ASSET')
    const liabilities = (accounts || []).filter((account: any) => account.account_type === 'LIABILITY')
    const equity = (accounts || []).filter((account: any) => account.account_type === 'EQUITY')

    const calculateBalance = async (account: any) => {
      const { data: transactions } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', account.id)
        .lte('date', asOfDate.toISOString())
      
      return (transactions || []).reduce((sum: number, transaction: any) => {
        if (account.account_type === 'ASSET') {
          return sum + (transaction.type === 'DEBIT' ? transaction.amount : -transaction.amount)
        } else {
          return sum + (transaction.type === 'CREDIT' ? transaction.amount : -transaction.amount)
        }
      }, 0)
    }

    const assetBalances = await Promise.all(assets.map(async (account: any) => ({
      ...account,
      balance: await calculateBalance(account)
    })))

    const liabilityBalances = await Promise.all(liabilities.map(async (account: any) => ({
      ...account,
      balance: await calculateBalance(account)
    })))

    const equityBalances = await Promise.all(equity.map(async (account: any) => ({
      ...account,
      balance: await calculateBalance(account)
    })))

    const totalAssets = assetBalances.reduce((sum: number, account: any) => sum + account.balance, 0)
    const totalLiabilities = liabilityBalances.reduce((sum: number, account: any) => sum + account.balance, 0)
    const totalEquity = equityBalances.reduce((sum: number, account: any) => sum + account.balance, 0)

    return {
      asOfDate,
      assets: assetBalances,
      liabilities: liabilityBalances,
      equity: equityBalances,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity
      }
    }
  }
}

// Export all services
export const FinancialSystem = {
  ChartOfAccounts: new ChartOfAccountsService(),
  Budget: new BudgetService(),
  Transaction: new TransactionService(),
  Payroll: new PayrollService(),
  Expense: new ExpenseService(),
  Reporting: new FinancialReportingService()
}
