export default function ExtensionAuthLayout({ children }: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            {children}
        </div>
    );
}
