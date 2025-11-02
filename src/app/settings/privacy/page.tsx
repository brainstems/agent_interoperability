'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheckIcon,
  LockClosedIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface ConsentRecord {
  id: string
  consent_type: string
  consent_given: boolean
  legal_basis: string
  consent_date: string
  withdrawn_date: string | null
}

interface PrivacyPreferences {
  opt_out_email: boolean
  opt_out_sms: boolean
  opt_out_phone: boolean
  opt_out_mail: boolean
  opt_out_profiling: boolean
  opt_out_ai_processing: boolean
  opt_out_benchmarking: boolean
  preferred_channel: string
  do_not_contact: boolean
  directory_visibility: string
  photo_permission: boolean
}

export default function PrivacySettingsPage() {
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPrivacyData()
  }, [])

  const fetchPrivacyData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/privacy/preferences')
      const data = await response.json()
      
      if (data.success) {
        setConsents(data.consents)
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Failed to fetch privacy data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: keyof PrivacyPreferences, value: any) => {
    if (!preferences) return

    try {
      setSaving(true)
      const updated = { ...preferences, [key]: value }
      setPreferences(updated)

      const response = await fetch('/api/privacy/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })

      if (!response.ok) {
        throw new Error('Failed to update preference')
      }
    } catch (error) {
      console.error('Failed to update preference:', error)
      fetchPrivacyData() // Revert on error
    } finally {
      setSaving(false)
    }
  }

  const revokeConsent = async (consentType: string) => {
    try {
      const response = await fetch('/api/privacy/consent/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_type: consentType })
      })

      if (response.ok) {
        fetchPrivacyData()
      }
    } catch (error) {
      console.error('Failed to revoke consent:', error)
    }
  }

  const getConsentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'email_marketing': 'Email Marketing',
      'sms_marketing': 'SMS Marketing',
      'phone_contact': 'Phone Contact',
      'data_profiling': 'Data Profiling & Analytics',
      'ai_processing': 'AI Processing',
      'data_sharing': 'Data Sharing',
      'photo_usage': 'Photo Usage',
      'testimony_sharing': 'Testimony Sharing',
      'directory_listing': 'Directory Listing'
    }
    return labels[type] || type
  }

  if (loading || !preferences) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <ShieldCheckIcon className="h-8 w-8 mr-3 text-primary-600" />
          Privacy & Consent
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your privacy preferences and consent settings
        </p>
      </div>

      {/* GDPR Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Your Privacy Rights</p>
            <p className="text-blue-800">
              You have the right to access, correct, delete, or export your personal data. 
              You can also object to or restrict certain processing activities. 
              Changes may take up to 24 hours to take effect.
            </p>
          </div>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BellAlertIcon className="h-6 w-6 mr-2 text-gray-600" />
            Communication Preferences
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose how we can contact you
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email</h3>
              <p className="text-xs text-gray-500">Receive emails about events and updates</p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_email', !preferences.opt_out_email)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_email ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_email ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">SMS/Text Messages</h3>
              <p className="text-xs text-gray-500">Receive text message notifications</p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_sms', !preferences.opt_out_sms)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_sms ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_sms ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Phone Calls</h3>
              <p className="text-xs text-gray-500">Receive phone calls from church staff</p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_phone', !preferences.opt_out_phone)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_phone ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_phone ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Physical Mail</h3>
              <p className="text-xs text-gray-500">Receive newsletters and announcements by mail</p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_mail', !preferences.opt_out_mail)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_mail ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_mail ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Preferred Contact Method
            </label>
            <select
              value={preferences.preferred_channel}
              onChange={(e) => updatePreference('preferred_channel', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="phone">Phone</option>
              <option value="mail">Mail</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI & Data Processing */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <LockClosedIcon className="h-6 w-6 mr-2 text-gray-600" />
            AI & Data Processing
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Control how your data is used for AI and analytics
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">AI Processing</h3>
              <p className="text-xs text-gray-500">
                Allow AI to analyze your data for personalized recommendations
              </p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_ai_processing', !preferences.opt_out_ai_processing)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_ai_processing ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_ai_processing ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Data Profiling</h3>
              <p className="text-xs text-gray-500">
                Create analytics profiles to better serve your needs
              </p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_profiling', !preferences.opt_out_profiling)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_profiling ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_profiling ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Benchmarking</h3>
              <p className="text-xs text-gray-500">
                Include your anonymized data in church benchmarking reports
              </p>
            </div>
            <button
              onClick={() => updatePreference('opt_out_benchmarking', !preferences.opt_out_benchmarking)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.opt_out_benchmarking ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.opt_out_benchmarking ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Visibility & Sharing */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <EyeSlashIcon className="h-6 w-6 mr-2 text-gray-600" />
            Visibility & Sharing
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Control who can see your information
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Directory Visibility
            </label>
            <select
              value={preferences.directory_visibility}
              onChange={(e) => updatePreference('directory_visibility', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="private">Private (Not listed)</option>
              <option value="church_only">Church Members Only</option>
              <option value="public">Public</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls who can see your profile in the church directory
            </p>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Photo Permission</h3>
              <p className="text-xs text-gray-500">
                Allow photos of you to be used in church publications
              </p>
            </div>
            <button
              onClick={() => updatePreference('photo_permission', !preferences.photo_permission)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                !preferences.photo_permission ? 'bg-gray-300' : 'bg-primary-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !preferences.photo_permission ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Active Consents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-gray-600" />
            Active Consents
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and manage your consent history
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {consents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No consent records found
              </p>
            ) : (
              consents.map((consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {consent.consent_given && !consent.withdrawn_date ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {getConsentLabel(consent.consent_type)}
                      </h3>
                      <div className="text-xs text-gray-500">
                        {consent.consent_given && !consent.withdrawn_date ? (
                          <span>
                            Granted on {new Date(consent.consent_date).toLocaleDateString()}
                          </span>
                        ) : consent.withdrawn_date ? (
                          <span>
                            Withdrawn on {new Date(consent.withdrawn_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>Not granted</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {consent.consent_given && !consent.withdrawn_date && (
                    <button
                      onClick={() => revokeConsent(consent.consent_type)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Data Rights Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Data Rights</h2>
          <p className="text-sm text-gray-600 mt-1">
            Exercise your data protection rights
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <h3 className="font-semibold text-gray-900 mb-1">Download My Data</h3>
            <p className="text-sm text-gray-600">
              Request a copy of all your personal data
            </p>
          </button>

          <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <h3 className="font-semibold text-gray-900 mb-1">Correct My Data</h3>
            <p className="text-sm text-gray-600">
              Update inaccurate or incomplete information
            </p>
          </button>

          <button className="p-4 border-2 border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left">
            <h3 className="font-semibold text-gray-900 mb-1">Delete My Data</h3>
            <p className="text-sm text-gray-600">
              Request deletion of your personal data
            </p>
          </button>

          <button className="p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <h3 className="font-semibold text-gray-900 mb-1">Contact Privacy Team</h3>
            <p className="text-sm text-gray-600">
              Questions about your privacy
            </p>
          </button>
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          <span className="text-sm text-gray-700">Saving...</span>
        </div>
      )}
    </div>
  )
}
