import { useState } from "react";
import { Supabase } from "../supabase";
import "../Login.css";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function SignIn(e) {
    e.preventDefault();
    const { error } = Supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(error);
    } else {
      console.log("Успешный вход");
    }
  }
  async function SignUp(e) {
    e.preventDefault();
    const { error } = await Supabase.auth.signUp({ email, password });
    const { data, error1 } = await Supabase.from("Profiles").insert({
      email,
      password,
    });
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-panel">
          <h2 className="login-title">Вход / Регистрация</h2>
          <p className="login-subtitle">
            Добро пожаловать! Введите e-mail и пароль.
          </p>

          <form onSubmit={SignIn} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="form-input"
              />
            </div>

            <div className="button-group">
              <button type="submit" className="btn-signin">
                Войти
              </button>

              <div className="divider-container">
                <div className="divider-line"></div>
                <div className="divider-text-wrapper">
                  <span className="divider-text">или</span>
                </div>
              </div>

              <button type="button" onClick={SignUp} className="btn-signup">
                Зарегистрироваться
              </button>
            </div>

            <p className="login-hint">
              После регистрации проверьте почту для подтверждения аккаунта.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
