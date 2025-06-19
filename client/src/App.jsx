import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Auth from './pages/auth/Auth'
import Dashboard from './pages/dashboard/dashboard';
import IsLogin from './pages/auth/isLogin';


function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route element = {<IsLogin/>}>
        <Route path="/" element={<Dashboard/>}/>
        </Route>
        <Route path='/signup' element={<Auth type="signup"/>}/>
        <Route path='/login' element={<Auth type="login"/>}/>
      </Routes>
    </Router>
  )
}

export default App
