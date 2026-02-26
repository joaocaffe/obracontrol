import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Hammer, LogIn, UserPlus, Loader2 } from 'lucide-react';

export function Auth() {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Verifique seu e-mail para confirmar o cadastro!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 shadow-2xl border-stone-200">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-stone-900 p-3 rounded-2xl text-white mb-4">
                        <Hammer size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900">ObraControl Pro</h1>
                    <p className="text-stone-500 text-sm">Gestão inteligente de obras</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <Input
                        label="E-mail"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Senha"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 italic">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="secondary"
                        className="w-full py-6 text-lg font-semibold"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : isSignUp ? (
                            <>
                                <UserPlus size={20} />
                                Criar Conta
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Entrar
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors"
                    >
                        {isSignUp
                            ? 'Já tem uma conta? Faça login'
                            : 'Não tem uma conta? Cadastre-se'}
                    </button>
                </div>
            </Card>
        </div>
    );
}
