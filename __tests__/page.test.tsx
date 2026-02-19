import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home Page', () => {
    it('renders a heading', () => {
        render(<Home />)

        const heading = screen.getByRole('heading', { level: 1 })

        expect(heading).toBeInTheDocument()
        expect(heading).toHaveTextContent(/Private Video Calls, Redefined/i)
    })

    it('renders login link', () => {
        render(<Home />)
        const loginLink = screen.getByRole('link', { name: /Login/i })
        expect(loginLink).toBeInTheDocument()
        expect(loginLink).toHaveAttribute('href', '/auth/login')
    })
})
