'use client';
import { useState, useCallback, useEffect } from 'react';
import { setAuthKey, getAuthKey } from '@/lib/auth';
import { API_BASE } from '@/lib/config';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface AuthGateProps {
    children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    // Client-side auth check after hydration (avoids SSR mismatch)
    useEffect(() => {
        // Extract ?key= from URL first — must run before any early returns
        // so that localhost:9808/?key=... correctly saves the key
        const urlParams = new URLSearchParams(window.location.search);
        const urlKey = urlParams.get('key');
        if (urlKey) {
            // Strip key from URL immediately (security: don't leave in browser history)
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('key');
            window.history.replaceState({}, '', cleanUrl.toString());
            // Save key to localStorage so all subsequent API calls use it
            setAuthKey(urlKey.trim());
        }

        // Removed isLocal bypass since Capacitor apps run on localhost but 
        // still need to authenticate with the remote backend.

        const savedKey = urlKey || getAuthKey();
        if (!savedKey) {
            // No key anywhere — show login form
            return;
        }

        // Validate key against backend (remote access)
        setChecking(true);
        fetch(`${API_BASE}/api/settings`, {
            headers: { 'X-Auth-Key': savedKey.trim() }
        }).then(res => {
            if (res.ok) {
                setAuthenticated(true);
            }
            // If invalid, fall through to show auth gate
        }).catch(() => {
            // Network error — show auth gate
        }).finally(() => setChecking(false));
    }, []);


    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;
        setChecking(true);
        setError('');

        let submittedKey = key.trim();
        let customApiBase = null;

        if (submittedKey.startsWith('http')) {
            try {
                const url = new URL(submittedKey);
                submittedKey = url.searchParams.get('key') || '';
                
                // If they pasted the frontend URL, assume backend is frontend port - 1
                let port = url.port;
                if (port === '9808') port = '9807';
                
                customApiBase = `${url.protocol}//${url.hostname}${port ? ':' + port : ''}`;
            } catch {
                // Ignore parse error, use as-is
            }
        }

        try {
            const res = await fetch(`${customApiBase || API_BASE}/api/settings`, {
                headers: { 'X-Auth-Key': submittedKey }
            });
            if (res.ok) {
                if (customApiBase) {
                    localStorage.setItem('custom-api-base', customApiBase);
                }
                setAuthKey(submittedKey);
                setAuthenticated(true);
                // Reload if we changed the base URL to apply it to all components
                if (customApiBase && customApiBase !== API_BASE) {
                    window.location.reload();
                }
            } else {
                setError('Invalid key');
            }
        } catch {
            setError(`Cannot reach server (${customApiBase || API_BASE})`);
        } finally {
            setChecking(false);
        }
    }, [key]);

    if (authenticated) return <>{children}</>;

    return (
        <div className="min-h-dvh w-full bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center pb-2">
                    <div className="mb-3"><Lock className="h-8 w-8 text-muted-foreground mx-auto" /></div>
                    <CardTitle className="text-xl">AntigravityChat</CardTitle>
                    <CardDescription>Auth Key or Connection URL</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="text"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Paste key or http://.../?key=..."
                            disabled={checking}
                            autoFocus
                        />
                        {error && (
                            <p className="text-destructive text-xs text-center">{error}</p>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={checking || !key.trim()}
                        >
                            {checking ? 'Checking...' : 'Enter'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
