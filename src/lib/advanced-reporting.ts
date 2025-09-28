import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export interface ReportQuery {
  select: string[]
  from: string
  joins?: Array<{
    type: 'INNER' | 'LEFT' | 'RIGHT'
    table: string
    on: string
  }>
  where?: Array<{
    field: string
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'BETWEEN'
    value: any
  }>
  groupBy?: string[]
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC'
  }>
  limit?: number
}

export interface DashboardWidget {
  id: string
  type: 'chart' | 'table' | 'metric' | 'gauge' | 'progress'
  title: string
  query: ReportQuery
  chartConfig?: {
    chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area'
    xAxis: string
    yAxis: string
    groupBy?: string
  }
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  refreshInterval?: number // minutes
}

// Advanced Reporting Engine
export class ReportingEngine {
  // Visual Query Builder
  async buildQuery(churchId: string, config: ReportQuery): Promise<string> {
    let sql = `SELECT ${config.select.join(', ')} FROM ${config.from}`
    
    // Add church filter
    const whereConditions = [`${config.from}.church_id = '${churchId}'`]
    
    // Add joins
    if (config.joins) {
      for (const join of config.joins) {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`
      }
    }
    
    // Add where conditions
    if (config.where) {
      for (const condition of config.where) {
        whereConditions.push(this.buildWhereCondition(condition))
      }
    }
    
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`
    }
    
    // Add group by
    if (config.groupBy) {
      sql += ` GROUP BY ${config.groupBy.join(', ')}`
    }
    
    // Add order by
    if (config.orderBy) {
      const orderClauses = config.orderBy.map(order => `${order.field} ${order.direction}`)
      sql += ` ORDER BY ${orderClauses.join(', ')}`
    }
    
    // Add limit
    if (config.limit) {
      sql += ` LIMIT ${config.limit}`
    }
    
    return sql
  }
  
  private buildWhereCondition(condition: any): string {
    const { field, operator, value } = condition
    
    switch (operator) {
      case 'LIKE':
        return `${field} LIKE '%${value}%'`
      case 'IN':
        const values = Array.isArray(value) ? value : [value]
        return `${field} IN (${values.map(v => `'${v}'`).join(', ')})`
      case 'BETWEEN':
        return `${field} BETWEEN '${value.start}' AND '${value.end}'`
      default:
        return `${field} ${operator} '${value}'`
    }
  }
  
  // Execute custom report
  async executeReport(churchId: string, reportConfig: ReportQuery): Promise<any[]> {
    const sql = await this.buildQuery(churchId, reportConfig)
    
    try {
      // Execute raw SQL query using Supabase RPC
      const { data, error } = await supabase.rpc('execute_custom_query', { query_sql: sql })
      
      if (error) {
        console.error('Report execution error:', error)
        throw new Error(`Failed to execute report: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Report execution error:', error)
      throw new Error('Failed to execute report')
    }
  }
  
  // Save custom report
  async saveReport(data: {
    churchId: string
    name: string
    description?: string
    reportType: string
    query: ReportQuery
    parameters?: any
    schedule?: string
    createdById: string
  }) {
    const { data: result, error } = await supabase
      .from('reports')
      .insert({
        church_id: data.churchId,
        name: data.name,
        description: data.description,
        report_type: data.reportType,
        query: data.query,
        parameters: data.parameters,
        schedule: data.schedule,
        created_by_id: data.createdById,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to save report: ${error.message}`)
    }
    
    return result
  }
  
  // Get predefined report templates
  getReportTemplates() {
    return [
      {
        name: 'Member Engagement Report',
        description: 'Analyze member attendance and participation',
        query: {
          select: [
            'm.first_name',
            'm.last_name',
            'COUNT(ea.id) as attendance_count',
            'MAX(ea.check_in_time) as last_attendance',
            'COUNT(d.id) as donation_count'
          ],
          from: 'members m',
          joins: [
            { type: 'LEFT', table: 'event_attendance ea', on: 'ea.member_id = m.id' },
            { type: 'LEFT', table: 'donations d', on: 'd.member_id = m.id' }
          ],
          where: [
            { field: 'ea.check_in_time', operator: '>=', value: '2024-01-01' }
          ],
          groupBy: ['m.id', 'm.first_name', 'm.last_name'],
          orderBy: [{ field: 'attendance_count', direction: 'DESC' }]
        }
      },
      {
        name: 'Financial Summary',
        description: 'Monthly financial overview',
        query: {
          select: [
            'DATE_TRUNC(\'month\', d.donation_date) as month',
            'SUM(d.amount) as total_donations',
            'COUNT(d.id) as donation_count',
            'AVG(d.amount) as average_donation'
          ],
          from: 'donations d',
          where: [
            { field: 'd.donation_date', operator: '>=', value: '2024-01-01' }
          ],
          groupBy: ['DATE_TRUNC(\'month\', d.donation_date)'],
          orderBy: [{ field: 'month', direction: 'ASC' }]
        }
      },
      {
        name: 'Ministry Participation',
        description: 'Track participation across ministries',
        query: {
          select: [
            'g.name as ministry_name',
            'COUNT(gm.id) as member_count',
            'AVG(DATE_PART(\'year\', AGE(m.date_of_birth))) as average_age'
          ],
          from: 'groups g',
          joins: [
            { type: 'LEFT', table: 'group_members gm', on: 'gm.group_id = g.id' },
            { type: 'LEFT', table: 'members m', on: 'm.id = gm.member_id' }
          ],
          where: [
            { field: 'g.group_type', operator: '=', value: 'MINISTRY' }
          ],
          groupBy: ['g.id', 'g.name'],
          orderBy: [{ field: 'member_count', direction: 'DESC' }]
        }
      }
    ]
  }
}

// Dashboard Builder
export class DashboardBuilder {
  async createDashboard(data: {
    churchId: string
    name: string
    description?: string
    layout: any
    isDefault?: boolean
    createdById: string
  }) {
    const { data: result, error } = await supabase
      .from('dashboards')
      .insert({
        church_id: data.churchId,
        name: data.name,
        description: data.description,
        layout: data.layout,
        is_default: data.isDefault || false,
        created_by_id: data.createdById,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create dashboard: ${error.message}`)
    }
    
    return result
  }
  
  async addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>) {
    const { data: result, error } = await supabase
      .from('dashboard_widgets')
      .insert({
        dashboard_id: dashboardId,
        name: widget.title,
        type: widget.type,
        config: {
          query: widget.query,
          chartConfig: widget.chartConfig,
          refreshInterval: widget.refreshInterval
        },
        position: widget.position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to add widget: ${error.message}`)
    }
    
    return result
  }
  
  async getDashboard(dashboardId: string) {
    const { data, error } = await supabase
      .from('dashboards')
      .select(`
        *,
        widgets:dashboard_widgets(*)
      `)
      .eq('id', dashboardId)
      .single()
    
    if (error) {
      throw new Error(`Failed to get dashboard: ${error.message}`)
    }
    
    return data
  }
  
  async getDefaultDashboards() {
    return [
      {
        name: 'Executive Overview',
        description: 'High-level church metrics for leadership',
        widgets: [
          {
            type: 'metric',
            title: 'Total Members',
            query: {
              select: ['COUNT(*)'],
              from: 'members',
              where: [{ field: 'member_status', operator: '!=', value: 'INACTIVE' }]
            },
            position: { x: 0, y: 0, width: 3, height: 2 }
          },
          {
            type: 'metric',
            title: 'Monthly Donations',
            query: {
              select: ['SUM(amount)'],
              from: 'donations',
              where: [
                { field: 'date', operator: '>=', value: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
              ]
            },
            position: { x: 3, y: 0, width: 3, height: 2 }
          },
          {
            type: 'chart',
            title: 'Attendance Trend',
            query: {
              select: ['DATE(e.start_datetime) as date', 'COUNT(ea.id) as attendance'],
              from: 'events e',
              joins: [
                { type: 'LEFT', table: 'event_attendance ea', on: 'ea.event_id = e.id' }
              ],
              where: [
                { field: 'e.start_datetime', operator: '>=', value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
              ],
              groupBy: ['DATE(e.start_datetime)'],
              orderBy: [{ field: 'date', direction: 'ASC' }]
            },
            chartConfig: {
              chartType: 'line',
              xAxis: 'date',
              yAxis: 'attendance'
            },
            position: { x: 0, y: 2, width: 6, height: 4 }
          }
        ]
      },
      {
        name: 'Financial Dashboard',
        description: 'Financial metrics and trends',
        widgets: [
          {
            type: 'chart',
            title: 'Monthly Giving Trend',
            query: {
              select: [
                'DATE_TRUNC(\'month\', donation_date) as month',
                'SUM(amount) as total'
              ],
              from: 'donations',
              where: [
                { field: 'donation_date', operator: '>=', value: new Date(new Date().getFullYear() - 1, 0, 1) }
              ],
              groupBy: ['DATE_TRUNC(\'month\', donation_date)'],
              orderBy: [{ field: 'month', direction: 'ASC' }]
            },
            chartConfig: {
              chartType: 'bar',
              xAxis: 'month',
              yAxis: 'total'
            },
            position: { x: 0, y: 0, width: 6, height: 4 }
          },
          {
            type: 'pie',
            title: 'Donations by Fund',
            query: {
              select: ['f.name', 'SUM(d.amount) as total'],
              from: 'donations d',
              joins: [
                { type: 'LEFT', table: 'funds f', on: 'f.id = d.fund_id' }
              ],
              where: [
                { field: 'd.donation_date', operator: '>=', value: new Date(new Date().getFullYear(), 0, 1) }
              ],
              groupBy: ['f.name'],
              orderBy: [{ field: 'total', direction: 'DESC' }]
            },
            chartConfig: {
              chartType: 'pie',
              xAxis: 'name',
              yAxis: 'total'
            },
            position: { x: 6, y: 0, width: 6, height: 4 }
          }
        ]
      }
    ]
  }
}

// Data Export Service
export class DataExportService {
  async exportToExcel(data: any[], filename: string): Promise<Buffer> {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }
  
  async exportToPDF(data: any[], title: string, columns: string[]): Promise<Buffer> {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(16)
    doc.text(title, 20, 20)
    
    // Add date
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30)
    
    // Add table
    const tableData = data.map(row => columns.map(col => row[col] || ''))
    
    ;(doc as any).autoTable({
      head: [columns],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    return Buffer.from(doc.output('arraybuffer'))
  }
  
  async exportToCSV(data: any[]): Promise<string> {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')
    
    return csvContent
  }
  
  async scheduleReport(reportId: string, schedule: string, format: 'PDF' | 'EXCEL' | 'CSV') {
    // This would integrate with a job scheduler like Bull Queue
    // For now, we'll just save the schedule configuration
    const { error } = await supabase
      .from('reports')
      .update({ 
        schedule,
        export_format: format,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
    
    if (error) {
      throw new Error(`Failed to schedule report: ${error.message}`)
    }
  }
}

// Comparative Analytics
export class ComparativeAnalytics {
  async getYearOverYearComparison(churchId: string, metric: string, currentYear: number) {
    const currentYearData = await this.getMetricByMonth(churchId, metric, currentYear)
    const previousYearData = await this.getMetricByMonth(churchId, metric, currentYear - 1)
    
    return {
      currentYear: currentYearData,
      previousYear: previousYearData,
      comparison: this.calculateComparison(currentYearData, previousYearData)
    }
  }
  
  private async getMetricByMonth(churchId: string, metric: string, year: number) {
    let query: any
    
    switch (metric) {
      case 'donations':
        query = {
          select: [
            'EXTRACT(month FROM donation_date) as month',
            'SUM(amount) as value'
          ],
          from: 'donations',
          where: [
            { field: 'EXTRACT(year FROM donation_date)', operator: '=', value: year }
          ],
          groupBy: ['EXTRACT(month FROM donation_date)'],
          orderBy: [{ field: 'month', direction: 'ASC' }]
        }
        break
      case 'attendance':
        query = {
          select: [
            'EXTRACT(month FROM e.start_datetime) as month',
            'AVG(e.attendance_count) as value'
          ],
          from: 'events e',
          where: [
            { field: 'EXTRACT(year FROM e.start_datetime)', operator: '=', value: year },
            { field: 'e.event_type', operator: '=', value: 'SERVICE' }
          ],
          groupBy: ['EXTRACT(month FROM e.start_datetime)'],
          orderBy: [{ field: 'month', direction: 'ASC' }]
        }
        break
      default:
        throw new Error(`Unsupported metric: ${metric}`)
    }
    
    const reportingEngine = new ReportingEngine()
    return await reportingEngine.executeReport(churchId, query)
  }
  
  private calculateComparison(current: any[], previous: any[]) {
    const comparison = []
    
    for (let month = 1; month <= 12; month++) {
      const currentData = current.find(d => d.month === month)
      const previousData = previous.find(d => d.month === month)
      
      const currentValue = currentData?.value || 0
      const previousValue = previousData?.value || 0
      
      const percentChange = previousValue > 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : 0
      
      comparison.push({
        month,
        current: currentValue,
        previous: previousValue,
        change: currentValue - previousValue,
        percentChange: Math.round(percentChange * 100) / 100
      })
    }
    
    return comparison
  }
  
  async getTrendAnalysis(churchId: string, metric: string, periods: number = 12) {
    // Get data for the specified number of periods
    const data = await this.getMetricTrend(churchId, metric, periods)
    
    // Calculate trend line using simple linear regression
    const trend = this.calculateTrendLine(data)
    
    return {
      data,
      trend,
      insights: this.generateInsights(data, trend)
    }
  }
  
  private async getMetricTrend(churchId: string, metric: string, periods: number) {
    // Implementation would depend on the specific metric
    // This is a simplified example
    return []
  }
  
  private calculateTrendLine(data: any[]) {
    if (data.length < 2) return null
    
    const n = data.length
    const sumX = data.reduce((sum, _, index) => sum + index, 0)
    const sumY = data.reduce((sum, item) => sum + item.value, 0)
    const sumXY = data.reduce((sum, item, index) => sum + (index * item.value), 0)
    const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return { slope, intercept }
  }
  
  private generateInsights(data: any[], trend: any) {
    const insights = []
    
    if (trend) {
      if (trend.slope > 0) {
        insights.push('Positive trend detected - metric is increasing over time')
      } else if (trend.slope < 0) {
        insights.push('Negative trend detected - metric is decreasing over time')
      } else {
        insights.push('Stable trend - metric remains relatively constant')
      }
    }
    
    // Add more insights based on data analysis
    const average = data.reduce((sum, item) => sum + item.value, 0) / data.length
    const latest = data[data.length - 1]?.value || 0
    
    if (latest > average * 1.2) {
      insights.push('Current performance is significantly above average')
    } else if (latest < average * 0.8) {
      insights.push('Current performance is below average - may need attention')
    }
    
    return insights
  }
}

// Export all services
export const AdvancedReporting = {
  Engine: new ReportingEngine(),
  Dashboard: new DashboardBuilder(),
  Export: new DataExportService(),
  Analytics: new ComparativeAnalytics()
}
