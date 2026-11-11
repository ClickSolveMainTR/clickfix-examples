<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ClickFix Laravel example</title>
    <style>body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 640px; }</style>
</head>
<body>
    <h1>Orders</h1>
    <p>Signed in as <strong>{{ $user->name }}</strong> ({{ $user->company_name }}).</p>
    <p>
        <button type="button" data-clickfix-launcher>Support</button>
        <button type="button" onclick="ClickFix('startConversation', 'Where is my order SP-1042?')">Ask about an order</button>
        <button type="button" onclick="ClickFix('reset')">Log out (reset)</button>
    </p>
    <p id="status">Widget: loading</p>

    {{-- Boots the widget and identifies $user (user_hash signed on the server by the package). --}}
    @clickfixWidget($user, ['locale' => 'en'])

    {{-- Re-identify with the company-bound hash (see App\Support\ClickFixIdentity), then show the result. --}}
    <script>
        ClickFix("on", "ready", function () {
            ClickFix("identify", @json($identity));
            ClickFix("track", "viewed_orders", { count: 3 });
        });
        ClickFix("on", "identify", function (e) {
            document.getElementById("status").textContent =
                "Widget: ready · identity " + (e.verified ? "verified" : "not verified") +
                (e.company_verified ? " (company bound)" : " (company not bound)");
        });
        ClickFix("on", "error", function (e) {
            document.getElementById("status").textContent = "Widget error: " + e.code;
        });
    </script>
</body>
</html>
