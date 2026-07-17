import { useState } from 'react'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import './App.css'

const FORM_BLUEPRINTS = {
  form_1: {
    transfer_to: '',
    date: '',
    gr_no: '',
    from_address: '',
    to_address: '',
    phone_number: '',
    mobile_number: '',
    from_pin_code: '',
    to_pin_code: '',
    total_amount: ''
  },

  form_2: {
    top_date: '',
    gr_no: '',
    Date: '',
    receipt_no: '',
    rupees_amount: '',
    rupees_in_words: '',
    customer_name: '',
    Bank_account_1: '',
    from_location: '',
    to_location: '',
    Bank_account_2: '',
    weight_tons: ''
  },

  form_3: {
    To: '',
    pin_code: '',
    mobile_no: '',
    gstin_no: '',
    date: '',
    gr_no: '',
    receipt_no: '',
    packages_count: '',
    amount_rs: '',
    amount_to: '',
    transportation: '',
    loading: '',
    unloading: '',
    packing_charge: '',
    unpacking_charge: '',
    two_wheeler: '',
    four_wheeler: '',
    service_charge: '',
    gr_charge: '',
    total: ''
  }
}

// Smart function to provide relevant suggestions based on the field name
const getPlaceholder = (key) => {
  const lowerKey = key.toLowerCase()

  if (lowerKey.includes('date')) return 'e.g., 18/07/2026'
  if (lowerKey.includes('name') || lowerKey.includes('transfer') || lowerKey === 'to') return 'e.g., Rattan Kumar'
  if (lowerKey.includes('address') || lowerKey.includes('location') || lowerKey.includes('line')) return 'e.g., Rajkot, Gujarat'
  if (lowerKey.includes('pin')) return 'e.g., 520001'
  if (lowerKey.includes('phone') || lowerKey.includes('mobile')) return 'e.g., +91 9876543210'
  if (lowerKey.includes('gr_no')) return 'e.g., GR-5566'
  if (lowerKey.includes('receipt')) return 'e.g., REC-7732'
  if (lowerKey.includes('gstin')) return 'e.g., 22AAAAA0000A1Z5'
  if (lowerKey.includes('words') || lowerKey === 'amount_to') return 'e.g., Fourteen Thousand Only'
  if (lowerKey.includes('amount') || lowerKey.includes('total') || lowerKey.includes('charge') || lowerKey.includes('wheeler') || lowerKey.includes('transportation') || lowerKey.includes('loading')) return ''
  if (lowerKey.includes('bank_account') || lowerKey.includes('bracket')) return 'e.g., Punjab National Bank'
  if (lowerKey.includes('weight') || lowerKey.includes('count')) return 'e.g., 5'

  // Fallback if no specific match is found
  return `e.g., Enter ${key.replace(/_/g, ' ')}`
}

function App() {
  const [activeForm, setActiveForm] = useState('form_1')

  const [formData, setFormData] = useState({
    ...FORM_BLUEPRINTS.form_1
  })

  const handleFormSwitch = (formName) => {
    setActiveForm(formName)

    setFormData({
      ...FORM_BLUEPRINTS[formName]
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }))
  }

  const handleClearField = (keyToClear) => {
    setFormData((previousData) => ({
      ...previousData,
      [keyToClear]: ''
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const payload = {
        ...formData,
        form_type: activeForm
      }

      const response = await axios.post(
        'https://document-generator-app-idh5.onrender.com/api/generate-receipt/',
        payload,
        {
          responseType: 'blob'
        }
      )

      const imageBlob = response.data
      const imageUrl = window.URL.createObjectURL(imageBlob)

      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(
        imageUrl,
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight
      )

      pdf.save(`${activeForm}_generated.pdf`)

      window.URL.revokeObjectURL(imageUrl)
    } catch (error) {
      console.error('Error generating document:', error)
      alert('Something went wrong connecting to Django!')
    }
  }

  return (
    <main className="app-container">
      <h1 className="app-title">
        🧾 Document Generator
      </h1>

      <div className="tab-container">
        {Object.keys(FORM_BLUEPRINTS).map((formName) => (
          <button
            type="button"
            key={formName}
            onClick={() => handleFormSwitch(formName)}
            className={`tab ${
              activeForm === formName ? 'active-tab' : ''
            }`}
          >
            {formName.replace('_', ' ')}
          </button>
        ))}
      </div>

      <form
        className="document-form"
        onSubmit={handleSubmit}
      >
        {Object.keys(formData).map((key) => (
          <div
            className="form-field"
            key={key}
          >
            <label
              className="field-label"
              htmlFor={key}
            >
              {key.replace(/_/g, ' ') + ':'}
            </label>

            <div className="input-row">
              <input
                id={key}
                className="form-input"
                type="text"
                name={key}
                value={formData[key]}
                onChange={handleChange}
                placeholder={getPlaceholder(key)} /* THIS LINE ADDS THE SUGGESTIONS */
              />

              <button
                type="button"
                className="clear-button"
                onClick={() => handleClearField(key)}
                title={`Clear ${key.replace(/_/g, ' ')}`}
                aria-label={`Clear ${key.replace(/_/g, ' ')}`}
              >
                x
              </button>
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="submit-button"
        >
          Download as PDF
        </button>
      </form>
    </main>
  )
}

export default App