import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#000', height: '100vh', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', padding: '24px', textAlign: 'center', gap: '12px'
        }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>SOMETHING WENT WRONG</div>
          <div style={{ fontSize: '0.75rem', color: '#ff3d71', maxWidth: '320px', lineHeight: 1.5 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '12px', padding: '10px 24px', background: '#fff',
              border: 'none', borderRadius: '8px', color: '#000',
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            RELOAD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
