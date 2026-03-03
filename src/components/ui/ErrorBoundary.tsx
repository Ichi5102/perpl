"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
    fallbackName: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.fallbackName}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="glass-tile w-full h-full p-6 flex flex-col items-center justify-center text-center space-y-4 border-red-500/30">
                    <h2 className="text-red-400 font-bold">Component Crashed: {this.props.fallbackName}</h2>
                    <p className="text-xs text-red-300/80 font-mono whitespace-pre-wrap text-left bg-black/50 p-4 rounded max-h-40 overflow-auto w-full">
                        {this.state.error?.toString()}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
