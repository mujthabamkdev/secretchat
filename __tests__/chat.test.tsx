import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInput from '../components/chat/ChatInput';

// Mock fetch globally
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: { id: 'test', content: 'hello' } }),
    })
) as jest.Mock;

describe('ChatInput', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('renders text input and toggle', () => {
        render(<ChatInput friendId="123" onSend={() => { }} />);
        const input = screen.getByPlaceholderText('Message...');
        expect(input).toBeInTheDocument();

        const toggleBtn = screen.getByTitle(/Turn on disappearing/i);
        expect(toggleBtn).toBeInTheDocument();
    });

    it('toggles placeholder based on ephemeral mode', () => {
        render(<ChatInput friendId="123" onSend={() => { }} />);
        const toggleBtn = screen.getByTitle(/Turn on disappearing/i);

        fireEvent.click(toggleBtn);
        // Becomes "Type a secret..."
        expect(screen.getByPlaceholderText('Type a secret...')).toBeInTheDocument();
    });

    it('calls API and onSend callback on submit', async () => {
        const handleSend = jest.fn();
        render(<ChatInput friendId="123" onSend={handleSend} />);

        const input = screen.getByPlaceholderText('Message...');
        fireEvent.change(input, { target: { value: 'Hello friend' } });

        const form = input.closest('form');
        expect(form).toBeInTheDocument();
        fireEvent.submit(form!);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/chat/messages', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    friendId: '123',
                    content: 'Hello friend',
                    type: 'TEXT'
                })
            }));
            expect(handleSend).toHaveBeenCalled();
            // Input should be cleared
            expect(input).toHaveValue('');
        });
    });
});
