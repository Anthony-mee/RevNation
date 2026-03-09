@echo off
echo Adding firewall rule for RevNation Backend...
netsh advfirewall firewall add rule name="RevNation Backend" dir=in action=allow protocol=TCP localport=4000
echo.
echo Firewall rule added successfully!
echo.
echo Now reload your Expo app on your phone and try uploading the photo again.
echo.
pause
