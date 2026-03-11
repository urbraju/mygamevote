import React from 'react';
import { View, Text, Button } from 'react-native';

interface Props {
    children?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>Something went wrong.</Text>
                    <Text style={{ color: '#333', marginBottom: 20 }}>{this.state.error?.toString()}</Text>
                    <Button title="Reload App" onPress={() => window.location.reload()} />
                </View>
            );
        }

        return this.props.children;
    }
}
