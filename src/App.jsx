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
    gr_date: '',
    receipt_no: '',
    rupees_amount: '',
    rupees_in_words: '',
    customer_name: '',
    customer_bracket_info: '',
    from_location: '',
    to_location: '',
    truck_bracket_info: '',
    weight_tons: ''
  },

  form_3: {
    to_line_1: '',
    pin_code: '',
    mobile_no: '',
    gstin_no: '',
    date: '',
    gr_no: '',
    receipt_no: '',
    packages_count: '',
    amount_rs: '',
    amount_to: '',
    to_and: '',
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

// Provides suggestions based on the field name
const getPlaceholder = (key) => {
  const lowerKey = key.toLowerCase()

  if (lowerKey.includes('date')) {
    return 'e.g., 18/07/2026'
  }

  if (
    lowerKey.includes('name') ||
    lowerKey.includes('transfer') ||
    lowerKey === 'to'
  ) {
    return 'e.g., Rattan Kumar'
  }

  if (
    lowerKey.includes('address') ||
    lowerKey.includes('location') ||
    lowerKey.includes('line')
  ) {
    return 'e.g., Rajkot, Gujarat'
  }

  if (lowerKey.includes('pin')) {
    return 'e.g., 520001'
  }

  if (
    lowerKey.includes('phone') ||
    lowerKey.includes('mobile')
  ) {
    return 'e.g., +91 9876543210'
  }

  if (lowerKey.includes('gr_no')) {
    return 'e.g., GR-5566'
  }

  if (lowerKey.includes('receipt')) {
    return 'e.g., REC-7732'
  }

  if (lowerKey.includes('gstin')) {
    return 'e.g., 22AAAAA0000A1Z5'
  }

  if (
    lowerKey.includes('words') ||
    lowerKey === 'amount_to'
  ) {
    return 'e.g., Fourteen Thousand Only'
  }

  if (
    lowerKey.includes('amount') ||
    lowerKey.includes('total') ||
    lowerKey.includes('charge') ||
    lowerKey.includes('wheeler') ||
    lowerKey.includes('transportation') ||
    lowerKey.includes('loading')
  ) {
    return ''
  }

  if (
    lowerKey.includes('bank_account') ||
    lowerKey.includes('bracket')
  ) {
    return 'e.g., Punjab National Bank'
  }

  if (
    lowerKey.includes('weight') ||
    lowerKey.includes('count')
  ) {
    return 'e.g., 5'
  }

  return `e.g., Enter ${key.replace(/_/g, ' ')}`
}

// Converts the image blob returned by Django into a data URL
const blobToDataURL = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => resolve(reader.result)
    reader.onerror = () => {
      reject(new Error('Failed to read the generated image'))
    }

    reader.readAsDataURL(blob)
  })
}

// Waits until the returned image is completely loaded
const loadImage = (imageSource) => {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => {
      reject(new Error('The generated image could not be loaded'))
    }

    image.src = imageSource
  })
}

function App() {
  const [activeForm, setActiveForm] = useState('form_1')

  const [formData, setFormData] = useState({
    ...FORM_BLUEPRINTS.form_1
  })

  const [isGenerating, setIsGenerating] = useState(false)

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

    if (isGenerating) {
      return
    }

    setIsGenerating(true)

    try {
      const payload = {
        ...formData,
        form_type: activeForm
      }

      const response = await axios.post(
        'https://document-generator-app-idh5.onrender.com/api/generate-receipt/',
        payload,
        {
          responseType: 'blob',

          // Render's free server may take time to wake up
          timeout: 120000
        }
      )

      const contentType = response.headers['content-type'] || ''

      // Django should return a PNG image
      if (!contentType.includes('image/png')) {
        let errorMessage = 'The backend did not return a PNG image.'

        try {
          const responseText = await response.data.text()
          const errorData = JSON.parse(responseText)

          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Keep the default error message
        }

        throw new Error(errorMessage)
      }

      const imageDataURL = await blobToDataURL(response.data)

      // Make sure the image is ready before putting it inside the PDF
      await loadImage(imageDataURL)

      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imageProperties = pdf.getImageProperties(imageDataURL)

      // Scale the image without stretching it
      const scale = Math.min(
        pdfWidth / imageProperties.width,
        pdfHeight / imageProperties.height
      )

      const imageWidth = imageProperties.width * scale
      const imageHeight = imageProperties.height * scale

      const imageX = (pdfWidth - imageWidth) / 2
      const imageY = (pdfHeight - imageHeight) / 2

      pdf.addImage(
        imageDataURL,
        'PNG',
        imageX,
        imageY,
        imageWidth,
        imageHeight
      )

      pdf.save(`${activeForm}_generated.pdf`)
    } catch (error) {
      console.error('Error generating document:', error)

      if (error.code === 'ECONNABORTED') {
        alert(
          'The backend took too long to respond. Render may still be waking up. Please try again.'
        )
      } else if (error.response) {
        alert(
          `The backend returned an error: ${
            error.message || 'Document generation failed.'
          }`
        )
      } else {
        alert(
          error.message ||
          'Something went wrong while generating the document.'
        )
      }
    } finally {
      setIsGenerating(false)
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
                placeholder={getPlaceholder(key)}
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
          disabled={isGenerating}
        >
          {isGenerating
            ? 'Generating PDF...'
            : 'Download as PDF'}
        </button>
      </form>
    </main>
  )
}

export default App