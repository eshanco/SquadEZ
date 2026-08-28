import { FirebaseError } from 'firebase/app'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '../firebase/auth'
import { getAuthErrorMessage } from '../firebase/authErrors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      // Don't reveal whether an account exists for this email.
      if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
        setSent(true)
      } else {
        setError(getAuthErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-emerald-700">
          Reset your password
        </h1>

        {sent ? (
          <p className="text-sm text-slate-600">
            If an account exists for <strong>{email}</strong>, a password reset link has been
            sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/login" className="text-emerald-700 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
