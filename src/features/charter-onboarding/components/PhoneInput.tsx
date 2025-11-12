import clsx from "clsx";
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

type PhoneCountry = { code: string; dial: string; label: string };
const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "MY", dial: "+60", label: "Malaysia" },
  { code: "SG", dial: "+65", label: "Singapore" },
  { code: "ID", dial: "+62", label: "Indonesia" },
  { code: "TH", dial: "+66", label: "Thailand" },
  { code: "PH", dial: "+63", label: "Philippines" },
];

type PhoneInputProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: boolean;
  disabled?: boolean;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    { name, value, onChange, onBlur, error = false, disabled = false },
    ref
  ) {
    const [selected, setSelected] = useState(PHONE_COUNTRIES[0]);
    const [localNumber, setLocalNumber] = useState("");
    useEffect(() => {
      if (!value) {
        setSelected(PHONE_COUNTRIES[0]);
        setLocalNumber("");
        return;
      }
      const trimmed = value.trim();
      const match = PHONE_COUNTRIES.find((option) =>
        trimmed.startsWith(option.dial)
      );
      const nextCountry = match ?? PHONE_COUNTRIES[0];
      const nextNumber = match
        ? trimmed.slice(match.dial.length).trimStart()
        : trimmed;
      setSelected(nextCountry);
      setLocalNumber(nextNumber);
    }, [value]);
    const compose = useCallback(
      (dial: string, number: string) => (number ? `${dial} ${number}` : dial),
      []
    );
    const handleDialChange = (event: ChangeEvent<HTMLSelectElement>) => {
      const next = PHONE_COUNTRIES.find(
        (option) => option.code === event.target.value
      );
      if (!next) return;
      setSelected(next);
      onChange(compose(next.dial, localNumber));
    };
    const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const formatted = raw.replace(/[^0-9\s-]/g, "");
      setLocalNumber(formatted);
      onChange(compose(selected.dial, formatted.trim()));
    };
    const borderClass = error
      ? "border-red-500 focus-within:ring-red-200"
      : "border-slate-200 focus-within:ring-slate-300";
    return (
      <div
        className={clsx(
          "flex items-center overflow-hidden rounded-lg border bg-white focus-within:ring-2 transition",
          borderClass,
          disabled ? "bg-slate-50" : ""
        )}
      >
        <select
          name={`${name}-country`}
          value={selected.code}
          onChange={handleDialChange}
          onBlur={onBlur}
          disabled={disabled}
          className=" min-w-[96px] border-r border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 outline-none"
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.code} {country.dial}
            </option>
          ))}
        </select>
        <input
          ref={ref}
          name={name}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={onBlur}
          disabled={disabled}
          className="flex-1 p-3 text-sm outline-none bg-slate-50 text-slate-900 placeholder:text-slate-400"
          placeholder="123-456-7890"
        />
      </div>
    );
  }
);
